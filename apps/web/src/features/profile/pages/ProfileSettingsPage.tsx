"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { AuthGuard } from "@/components/auth/guard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarCropDialog, useUploadMedia } from "@/features/media";
import type { AvatarTransformResult } from "@/features/media/lib/avatar-transform";
import {
  profileSettingsSchema,
  type ProfileSettingsValues,
} from "@/features/profile/schemas/profile-settings.schema";
import { useUpdateMyProfile } from "@/features/profiles/hooks/mutations";
import { useMyProfile } from "@/features/profiles/hooks/queries";
import { applyApiErrorsToForm } from "@/lib/forms/api-errors";
import {
  getProfileRoute,
  getProfileSettingsRoute,
  normalizeUsername,
} from "@/lib/routes";

const AVATAR_CONTEXT = "profile_avatar" as const;
const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type ProfileSettingsPageProps = {
  username?: string;
};

export default function ProfileSettingsPage({
  username,
}: ProfileSettingsPageProps) {
  const router = useRouter();
  const myProfileQuery = useMyProfile();
  const uploadMediaMutation = useUploadMedia();
  const avatarUpdateMutation = useUpdateMyProfile();
  const profileUpdateMutation = useUpdateMyProfile();

  const form = useForm<ProfileSettingsValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      displayName: "",
      bio: "",
    },
  });
  const displayName = form.watch("displayName");
  const [formError, setFormError] = useState("");
  const [avatarPreviewURL, setAvatarPreviewURL] = useState<string>("");
  const [localAvatarPreviewURL, setLocalAvatarPreviewURL] = useState<
    string | null
  >(null);
  const [cropSourceURL, setCropSourceURL] = useState<string | null>(null);
  const [cropSourceFileName, setCropSourceFileName] = useState<string>("");
  const [cropDialogOpen, setCropDialogOpen] = useState(false);

  useEffect(() => {
    const profile = myProfileQuery.data?.profile;
    if (!profile) return;
    form.reset({
      displayName: profile.displayName ?? "",
      bio: profile.bio ?? "",
    });
  }, [
    form,
    myProfileQuery.data?.profile?.userId,
    myProfileQuery.data?.profile?.displayName,
    myProfileQuery.data?.profile?.bio,
  ]);

  useEffect(() => {
    const profile = myProfileQuery.data?.profile;
    if (!profile) return;
    if (
      !localAvatarPreviewURL &&
      profile.avatarUrl &&
      profile.avatarUrl !== avatarPreviewURL
    ) {
      setAvatarPreviewURL(profile.avatarUrl ?? "");
    }
  }, [avatarPreviewURL, myProfileQuery.data?.profile, localAvatarPreviewURL]);

  useEffect(() => {
    return () => {
      if (localAvatarPreviewURL) URL.revokeObjectURL(localAvatarPreviewURL);
      if (cropSourceURL) URL.revokeObjectURL(cropSourceURL);
    };
  }, [localAvatarPreviewURL, cropSourceURL]);

  const initials = useMemo(() => {
    const source =
      displayName.trim() || myProfileQuery.data?.profile.username || "U";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [displayName, myProfileQuery.data?.profile.username]);

  const isUploadingAvatar =
    uploadMediaMutation.isPending || avatarUpdateMutation.isPending;
  const closeUsername =
    myProfileQuery.data?.profile.username ?? username ?? null;
  const closeHref = closeUsername
    ? getProfileRoute(normalizeUsername(closeUsername))
    : "/profile";
  const normalizedRouteUsername = username ? normalizeUsername(username) : null;
  const normalizedProfileUsername = myProfileQuery.data?.profile.username
    ? normalizeUsername(myProfileQuery.data.profile.username)
    : null;
  const isProfileMismatch =
    normalizedRouteUsername != null &&
    normalizedProfileUsername != null &&
    normalizedRouteUsername !== normalizedProfileUsername;

  const openCropper = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error("Unsupported image type. Use JPG, PNG, WebP, or GIF.");
      return;
    }
    if (cropSourceURL) URL.revokeObjectURL(cropSourceURL);
    const nextSourceURL = URL.createObjectURL(file);
    setCropSourceURL(nextSourceURL);
    setCropSourceFileName(file.name);
    setCropDialogOpen(true);
  };

  const clearLocalAvatarPreview = () => {
    if (localAvatarPreviewURL) URL.revokeObjectURL(localAvatarPreviewURL);
    setLocalAvatarPreviewURL(null);
  };

  const uploadAvatar = async (
    result: AvatarTransformResult,
    previewUrl: string,
  ) => {
    try {
      const uploaded = await uploadMediaMutation.mutateAsync({
        file: result.file,
        contextType: AVATAR_CONTEXT,
      });
      const updated = await avatarUpdateMutation.mutateAsync({
        avatarUrl: uploaded.objectKey,
      });
      clearLocalAvatarPreview();
      setAvatarPreviewURL(updated.profile.avatarUrl || previewUrl);
      toast.success("Avatar updated");
    } catch (error) {
      clearLocalAvatarPreview();
      setAvatarPreviewURL(myProfileQuery.data?.profile.avatarUrl ?? "");
      const message =
        error instanceof Error ? error.message : "Failed to upload avatar";
      toast.error(message);
    }
  };

  const applyPreparedAvatar = (result: AvatarTransformResult) => {
    clearLocalAvatarPreview();
    const nextPreviewURL = URL.createObjectURL(result.file);
    setLocalAvatarPreviewURL(nextPreviewURL);
    setAvatarPreviewURL(nextPreviewURL);
    if (cropSourceURL) {
      URL.revokeObjectURL(cropSourceURL);
      setCropSourceURL(null);
    }
    void uploadAvatar(result, nextPreviewURL);
  };

  const onSaveProfile = async (values: ProfileSettingsValues) => {
    setFormError("");
    try {
      await profileUpdateMutation.mutateAsync({
        displayName: values.displayName.trim() || undefined,
        bio: values.bio.trim() || undefined,
      });
      toast.success("Profile saved");
    } catch (error) {
      const result = applyApiErrorsToForm(form, error, {
        fieldMap: profileSettingsApiFieldMap,
        fallbackMessage: "Failed to save profile",
      });
      if (result.globalMessages.length > 0) {
        setFormError(result.globalMessages.join("\n"));
      }
    }
  };

  return (
    <AuthGuard
      title="Sign in to edit your profile"
      description="Please sign in to manage your profile."
    >
      <div className="container mx-auto max-w-2xl space-y-8 px-4 py-6 sm:px-6">
        {isProfileMismatch ? (
          <section className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Profile mismatch
              </h1>
              <p className="text-sm text-muted-foreground">
                These settings belong to your signed-in profile.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() =>
                  router.replace(
                    getProfileSettingsRoute(normalizedProfileUsername),
                  )
                }
              >
                Go to my settings
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(getProfileRoute(normalizedRouteUsername))
                }
              >
                Back to profile
              </Button>
            </div>
          </section>
        ) : (
          <section className="space-y-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Profile Settings
              </h1>
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <Avatar className="h-24 w-24 shrink-0 rounded-full">
                <AvatarImage
                  src={avatarPreviewURL}
                  className="rounded-full object-cover"
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="grid w-full gap-2">
                <Label htmlFor="avatar">Upload avatar photo</Label>
                <Input
                  id="avatar"
                  type="file"
                  className="sm:flex-1"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={isUploadingAvatar}
                  onChange={(event) => {
                    const selected = event.target.files?.[0] ?? null;
                    event.currentTarget.value = "";
                    if (!selected) return;
                    openCropper(selected);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  After cropping, the photo uploads automatically. Allowed:
                  JPG, PNG, WebP, GIF. Max: {formatBytes(MAX_AVATAR_BYTES)}.
                </p>
                {isUploadingAvatar ? (
                  <p className="text-xs text-muted-foreground">
                    <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
                    Uploading avatar...
                  </p>
                ) : null}
              </div>
            </div>

            <Form {...form}>
              <form
                className="grid gap-6"
                noValidate
                onSubmit={form.handleSubmit(onSaveProfile)}
              >
                {formError ? (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {formError}
                  </p>
                ) : null}
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Your full name"
                          autoComplete="off"
                          maxLength={80}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Tell us about yourself"
                          className="resize-none"
                          rows={4}
                          maxLength={500}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(closeHref)}
                  >
                    Close
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      profileUpdateMutation.isPending ||
                      form.formState.isSubmitting
                    }
                  >
                    {profileUpdateMutation.isPending ||
                    form.formState.isSubmitting
                      ? "Saving..."
                      : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>

            {myProfileQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading profile...
              </p>
            ) : null}
          </section>
        )}
      </div>

      {cropSourceURL ? (
        <AvatarCropDialog
          open={cropDialogOpen}
          imageSrc={cropSourceURL}
          fileName={cropSourceFileName}
          onOpenChange={(open) => {
            setCropDialogOpen(open);
            if (!open && cropSourceURL) {
              URL.revokeObjectURL(cropSourceURL);
              setCropSourceURL(null);
            }
          }}
          onDone={applyPreparedAvatar}
        />
      ) : null}
    </AuthGuard>
  );
}

const profileSettingsApiFieldMap = {
  display_name: "displayName",
} satisfies Record<string, keyof ProfileSettingsValues>;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
