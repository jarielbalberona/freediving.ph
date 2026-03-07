"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

import { AuthGuard } from "@/components/auth/guard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarCropDialog, useUploadMedia } from "@/features/media";
import type { AvatarTransformResult } from "@/features/media/lib/avatar-transform";
import { useUpdateMyProfile } from "@/features/profiles/hooks/mutations";
import { useMyProfile } from "@/features/profiles/hooks/queries";

const AVATAR_CONTEXT = "profile_avatar" as const;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export default function ProfileSettingsPage() {
  const myProfileQuery = useMyProfile();
  const uploadMediaMutation = useUploadMedia();
  const updateProfileMutation = useUpdateMyProfile();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreviewURL, setAvatarPreviewURL] = useState<string>("");
  const [localAvatarPreviewURL, setLocalAvatarPreviewURL] = useState<string | null>(null);
  const [preparedAvatar, setPreparedAvatar] = useState<AvatarTransformResult | null>(null);
  const [cropSourceURL, setCropSourceURL] = useState<string | null>(null);
  const [cropSourceFileName, setCropSourceFileName] = useState<string>("");
  const [cropDialogOpen, setCropDialogOpen] = useState(false);

  useEffect(() => {
    const profile = myProfileQuery.data?.profile;
    if (!profile) return;
    setDisplayName(profile.displayName ?? "");
    setBio(profile.bio ?? "");
    if (!localAvatarPreviewURL && !preparedAvatar && profile.avatarUrl && profile.avatarUrl !== avatarPreviewURL) {
      setAvatarPreviewURL(profile.avatarUrl ?? "");
    }
  }, [avatarPreviewURL, myProfileQuery.data?.profile, localAvatarPreviewURL, preparedAvatar]);

  useEffect(() => {
    return () => {
      if (localAvatarPreviewURL) URL.revokeObjectURL(localAvatarPreviewURL);
      if (cropSourceURL) URL.revokeObjectURL(cropSourceURL);
    };
  }, [localAvatarPreviewURL, cropSourceURL]);

  const initials = useMemo(() => {
    const source = displayName.trim() || myProfileQuery.data?.profile.username || "U";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }, [displayName, myProfileQuery.data?.profile.username]);

  const isUploadingAvatar = uploadMediaMutation.isPending || updateProfileMutation.isPending;

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

  const applyPreparedAvatar = (result: AvatarTransformResult) => {
    if (localAvatarPreviewURL) URL.revokeObjectURL(localAvatarPreviewURL);
    const nextPreviewURL = URL.createObjectURL(result.file);
    setLocalAvatarPreviewURL(nextPreviewURL);
    setAvatarPreviewURL(nextPreviewURL);
    setPreparedAvatar(result);
    if (cropSourceURL) {
      URL.revokeObjectURL(cropSourceURL);
      setCropSourceURL(null);
    }
  };

  const onUploadAvatar = async () => {
    if (!preparedAvatar) return;
    try {
      const uploaded = await uploadMediaMutation.mutateAsync({
        file: preparedAvatar.file,
        contextType: AVATAR_CONTEXT,
      });
      const updated = await updateProfileMutation.mutateAsync({ avatarUrl: uploaded.objectKey });
      const persistedAvatarURL = updated.profile.avatarUrl;

      if (localAvatarPreviewURL) {
        URL.revokeObjectURL(localAvatarPreviewURL);
      }
      setLocalAvatarPreviewURL(null);
      setPreparedAvatar(null);
      setAvatarPreviewURL(persistedAvatarURL || avatarPreviewURL);
      toast.success("Avatar updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload avatar";
      toast.error(message);
    }
  };

  const onSaveProfile = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      toast.success("Profile saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save profile";
      toast.error(message);
    }
  };

  return (
    <AuthGuard
      title="Sign in to edit your profile"
      description="Please sign in to manage your profile."
    >
      <div className="container mx-auto max-w-2xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24 rounded-full">
                  <AvatarImage src={avatarPreviewURL} className="rounded-full object-cover" />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Label htmlFor="avatar">Upload avatar photo</Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => {
                      const selected = event.target.files?.[0] ?? null;
                      event.currentTarget.value = "";
                      if (!selected) return;
                      openCropper(selected);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Crop + auto-compress before upload. Allowed: JPG, PNG, WebP, GIF. Max:{" "}
                    {formatBytes(MAX_AVATAR_BYTES)}.
                  </p>
                  {preparedAvatar ? (
                    <p className="text-xs text-muted-foreground">
                      Ready: {preparedAvatar.width}x{preparedAvatar.height} •{" "}
                      {formatBytes(preparedAvatar.sizeBytes)} ({preparedAvatar.mimeType})
                    </p>
                  ) : null}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={onUploadAvatar}
                disabled={!preparedAvatar || isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Upload Avatar
                  </>
                )}
              </Button>
            </div>

            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="display-name">Display Name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your full name"
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Tell us about yourself"
                  className="resize-none"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={onSaveProfile} disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            {myProfileQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading profile...</p>
            ) : null}
          </CardContent>
        </Card>
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
