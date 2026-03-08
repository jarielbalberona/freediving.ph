"use client";

import type { CreateMediaPostValues } from "@/features/media/schemas/create-media-post.schema";
import type {
  ExploreSiteCard,
  MediaUploadResponse,
} from "@freediving.ph/types";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  LoaderCircle,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { useCreateMediaPost, useUploadMedia } from "@/features/media/hooks";
import { createMediaPostSchema } from "@/features/media/schemas/create-media-post.schema";
import { getProfileRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { DiveSitePicker } from "./DiveSitePicker";

type ProfileMediaComposerProps = {
  username: string;
  onPublished?: () => void;
};

type UploadStatus = "queued" | "uploading" | "uploaded" | "failed";

type ComposerPhoto = {
  localId: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  status: UploadStatus;
  upload?: MediaUploadResponse;
  error?: string;
};

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function ProfileMediaComposer({
  username,
  onPublished,
}: ProfileMediaComposerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const photosRef = useRef<ComposerPhoto[]>([]);
  const [photos, setPhotos] = useState<ComposerPhoto[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedDiveSite, setSelectedDiveSite] =
    useState<ExploreSiteCard | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadMutation = useUploadMedia();
  const createPostMutation = useCreateMediaPost();

  const form = useForm<CreateMediaPostValues>({
    resolver: zodResolver(createMediaPostSchema),
    mode: "onChange",
    defaultValues: {
      diveSiteId: "",
      postCaption: "",
      applyCaptionToAll: false,
      sharedCaption: "",
      items: [],
    },
  });
  const fieldArray = useFieldArray({
    control: form.control,
    name: "items",
  });

  const activePhoto = photos[activeIndex] ?? null;
  const failedCount = photos.filter((item) => item.status === "failed").length;
  const uploadingCount = photos.filter(
    (item) => item.status === "uploading",
  ).length;
  const uploadComplete =
    photos.length > 0 && photos.every((item) => item.status === "uploaded");
  const canPublish =
    photos.length > 0 &&
    uploadComplete &&
    failedCount === 0 &&
    form.formState.isValid &&
    !createPostMutation.isPending;

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      for (const photo of photosRef.current) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    };
  }, []);

  async function handleFilesSelected(nextFiles: File[]) {
    if (nextFiles.length === 0) return;

    const remainingSlots = MAX_FILES - photos.length;
    if (remainingSlots <= 0) {
      toast.error("You can upload up to 10 photos per post.");
      return;
    }

    const acceptedFiles = nextFiles.slice(0, remainingSlots);
    if (acceptedFiles.length < nextFiles.length) {
      toast.error("Only the first 10 photos were kept.");
    }

    const prepared: ComposerPhoto[] = [];
    for (const file of acceptedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 5 MB.`);
        continue;
      }
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        toast.error(`${file.name} is not a supported image type.`);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      const dimensions = await readImageDimensions(file);
      prepared.push({
        localId: createLocalId(),
        file,
        previewUrl,
        width: dimensions.width,
        height: dimensions.height,
        status: "queued" as const,
      });
    }

    if (prepared.length === 0) return;

    const sharedCaption = form.getValues("sharedCaption")?.trim() ?? "";
    const shouldApplyToAll = form.getValues("applyCaptionToAll");

    setPhotos((current) => [...current, ...prepared]);
    fieldArray.append(
      prepared.map((item) => ({
        localId: item.localId,
        caption: shouldApplyToAll ? sharedCaption : "",
      })),
    );
    if (photos.length === 0) {
      setActiveIndex(0);
    }

    void Promise.all(
      prepared.map((item) => uploadPhoto(item.localId, item.file)),
    );
  }

  async function uploadPhoto(localId: string, file: File) {
    setPhotos((current) =>
      current.map((item) =>
        item.localId === localId
          ? { ...item, status: "uploading", error: undefined }
          : item,
      ),
    );

    try {
      const response = await uploadMutation.mutateAsync({
        file,
        contextType: "profile_feed",
      });
      setPhotos((current) =>
        current.map((item) =>
          item.localId === localId
            ? {
                ...item,
                status: "uploaded",
                upload: response,
              }
            : item,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Upload failed. Remove the file or retry.";
      setPhotos((current) =>
        current.map((item) =>
          item.localId === localId
            ? { ...item, status: "failed", error: message }
            : item,
        ),
      );
    }
  }

  function removePhoto(index: number) {
    const photo = photos[index];
    if (!photo) return;
    URL.revokeObjectURL(photo.previewUrl);
    setPhotos((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
    fieldArray.remove(index);
    setActiveIndex((current) => {
      if (index < current) return current - 1;
      return Math.max(0, Math.min(current, photos.length - 2));
    });
  }

  async function onSubmit(values: CreateMediaPostValues) {
    const uploadedPhotos = photos.filter(
      (item) => item.status === "uploaded" && item.upload,
    );
    if (uploadedPhotos.length !== photos.length) {
      toast.error("Wait for uploads to finish before publishing.");
      return;
    }

    try {
      const response = await createPostMutation.mutateAsync({
        diveSiteId: values.diveSiteId,
        postCaption: values.postCaption?.trim() || null,
        applyCaptionToAll: values.applyCaptionToAll,
        source: "create_post",
        items: uploadedPhotos.map((item, index) => ({
          mediaObjectId: item.upload!.id,
          type: "photo",
          storageKey: item.upload!.objectKey,
          mimeType: item.upload!.mimeType,
          width: item.upload!.width || item.width,
          height: item.upload!.height || item.height,
          caption: values.items[index]?.caption?.trim() || null,
          sortOrder: index,
        })),
      });

      toast.success(
        `${response.items.length} photo${response.items.length > 1 ? "s" : ""} published.`,
      );
      onPublished?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Publish failed. Try again.",
      );
    }
  }

  function applySharedCaptionToAll(pressed: boolean) {
    form.setValue("applyCaptionToAll", pressed, {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (!pressed) return;
    const sharedCaption = form.getValues("sharedCaption")?.trim() ?? "";
    const nextItems = form.getValues("items").map((item) => ({
      ...item,
      caption: sharedCaption,
    }));
    form.setValue("items", nextItems, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(21rem,28rem)]"
      >
        <div className="space-y-4">
          <Card
            className={cn(
              "border-dashed bg-muted/20 transition-colors",
              isDragging && "border-primary bg-primary/5",
            )}
          >
            <CardContent className="p-0">
              {photos.length === 0 ? (
                <button
                  type="button"
                  className="flex min-h-[28rem] w-full flex-col items-center justify-center gap-4 px-6 text-center"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    void handleFilesSelected(
                      Array.from(event.dataTransfer.files),
                    );
                  }}
                >
                  <div className="rounded-full border border-border bg-background p-4">
                    <ImagePlus className="size-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-foreground">
                      Drag photos here or choose files
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Upload 1 to 10 photos. Each file must be 5 MB or smaller.
                    </p>
                  </div>
                  <Button type="button" variant="outline">
                    Select photos
                  </Button>
                </button>
              ) : (
                <div className="space-y-4 p-4">
                  <div className="relative overflow-hidden rounded-[1.75rem] border bg-background">
                    <div className="relative aspect-[4/5] w-full bg-muted/30">
                      <img
                        src={activePhoto?.previewUrl}
                        alt={activePhoto?.file.name ?? "Selected upload"}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="pointer-events-none absolute left-4 top-4 flex gap-2">
                      <Badge variant="secondary">
                        {activeIndex + 1} / {photos.length}
                      </Badge>
                      {activePhoto ? (
                        <Badge variant="secondary">
                          {activePhoto.width} x {activePhoto.height}
                        </Badge>
                      ) : null}
                    </div>
                    {photos.length > 1 ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full"
                          onClick={() =>
                            setActiveIndex((current) =>
                              current === 0 ? photos.length - 1 : current - 1,
                            )
                          }
                        >
                          <ArrowLeft className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full"
                          onClick={() =>
                            setActiveIndex((current) =>
                              current === photos.length - 1 ? 0 : current + 1,
                            )
                          }
                        >
                          <ArrowRight className="size-4" />
                        </Button>
                      </>
                    ) : null}
                  </div>

                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-3 pb-2">
                      {photos.map((item, index) => (
                        <button
                          key={item.localId}
                          type="button"
                          className={cn(
                            "relative overflow-hidden rounded-2xl border transition-transform",
                            activeIndex === index
                              ? "border-primary shadow-sm"
                              : "border-border opacity-80",
                          )}
                          onClick={() => setActiveIndex(index)}
                        >
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="h-24 w-24 object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-background/80 px-2 py-1 text-[11px]">
                            <span className="truncate">{index + 1}</span>
                            <span className="truncate">
                              {item.status === "uploaded"
                                ? "Ready"
                                : item.status}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(event) => {
              void handleFilesSelected(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-6 p-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Publish to @{username}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Location is required. Captions stay per photo.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                  disabled={photos.length >= MAX_FILES}
                >
                  Add photos
                </Button>
              </div>

              {uploadingCount > 0 ? (
                <Alert>
                  <LoaderCircle className="size-4 animate-spin" />
                  <AlertTitle>Uploading photos</AlertTitle>
                  <AlertDescription>
                    {uploadingCount} of {photos.length} photo
                    {photos.length > 1 ? "s are" : " is"} still uploading.
                  </AlertDescription>
                </Alert>
              ) : null}

              {failedCount > 0 ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Some uploads failed</AlertTitle>
                  <AlertDescription>
                    Remove failed files or retry them before publishing.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>

            <FormField
              control={form.control}
              name="diveSiteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dive site</FormLabel>
                  <FormControl>
                    <DiveSitePicker
                      value={field.value}
                      valueLabel={
                        selectedDiveSite
                          ? `${selectedDiveSite.name} · ${selectedDiveSite.area}`
                          : undefined
                      }
                      onValueChange={(site) => {
                        field.onChange(site?.id ?? "");
                        setSelectedDiveSite(site);
                      }}
                      disabled={createPostMutation.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Choose from the approved FPH dive-site directory.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sharedCaption"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-3">
                    <FormLabel>Shared caption</FormLabel>
                    <Toggle
                      type="button"
                      variant="outline"
                      pressed={form.watch("applyCaptionToAll")}
                      onPressedChange={applySharedCaptionToAll}
                    >
                      Apply to all
                    </Toggle>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Optional caption to copy to every selected photo"
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Turning the toggle on copies this caption to every selected
                    photo once.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="postCaption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post caption (future-ready)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional post-level note. Not the main profile caption in v1."
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {activePhoto ? (
              <div className="space-y-3 rounded-[1.5rem] border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Selected photo
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activePhoto.file.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {activePhoto.status === "failed" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void uploadPhoto(
                            activePhoto.localId,
                            activePhoto.file,
                          )
                        }
                      >
                        <RefreshCcw className="size-4" />
                        Retry
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePhoto(activeIndex)}
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  </div>
                </div>

                <Badge variant="secondary" className="w-fit">
                  {activePhoto.status === "uploaded"
                    ? "Upload complete"
                    : activePhoto.status}
                </Badge>
                {activePhoto.error ? (
                  <p className="text-sm text-destructive">
                    {activePhoto.error}
                  </p>
                ) : null}

                <FormField
                  control={form.control}
                  name={`items.${activeIndex}.caption`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Photo caption</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add a caption for this photo"
                          className="min-h-28"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This caption is what appears when the photo is shown
                        independently on profile.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <Alert>
                <AlertCircle className="size-4" />
                <AlertTitle>No photos selected yet</AlertTitle>
                <AlertDescription>
                  Add photos first. Upload starts immediately after selection.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(getProfileRoute(username))}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canPublish}>
                {createPostMutation.isPending
                  ? "Publishing..."
                  : "Publish photos"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Math.random().toString(36).slice(2, 10)}`;
}

function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      resolve({
        width: image.naturalWidth || 1,
        height: image.naturalHeight || 1,
      });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      resolve({ width: 1, height: 1 });
      URL.revokeObjectURL(objectUrl);
    };
    image.src = objectUrl;
  });
}
