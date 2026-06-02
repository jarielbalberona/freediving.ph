"use client";

import { ImagePlus, LoaderCircle, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useUploadMedia } from "@/features/media/hooks/mutations";
import { useCreateDiveMemory } from "@/features/profile/hooks/memory-mutations";
import { cn } from "@/lib/utils";

type DiveMemoryMediaComposerProps = {
  username: string;
  diveSiteId: string;
  diveSiteLabel: string;
  onPublished?: () => void;
  onCancel?: () => void;
};

type UploadStatus = "queued" | "uploading" | "uploaded" | "failed";

type ComposerPhoto = {
  localId: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  status: UploadStatus;
  upload?: {
    id: string;
    objectKey: string;
    mimeType: string;
    width: number;
    height: number;
  };
  error?: string;
};

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function DiveMemoryMediaComposer({
  username,
  diveSiteId,
  diveSiteLabel,
  onPublished,
  onCancel,
}: DiveMemoryMediaComposerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const photosRef = useRef<ComposerPhoto[]>([]);
  const uploadMutation = useUploadMedia();
  const createMemory = useCreateDiveMemory(username);
  const [photos, setPhotos] = useState<ComposerPhoto[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [body, setBody] = useState("");

  const activePhoto = photos[activeIndex] ?? null;
  const failedCount = photos.filter((item) => item.status === "failed").length;
  const uploadingCount = photos.filter(
    (item) => item.status === "uploading",
  ).length;
  const uploadComplete =
    photos.length > 0 && photos.every((item) => item.status === "uploaded");
  const hasPublishableContent =
    body.trim().length > 0 || photos.length > 0;
  const canPublish =
    hasPublishableContent &&
    (photos.length === 0 || uploadComplete) &&
    failedCount === 0 &&
    !createMemory.isPending;

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
      toast.error("You can upload up to 10 photos per memory.");
      return;
    }

    const acceptedFiles = nextFiles.slice(0, remainingSlots);
    if (acceptedFiles.length < nextFiles.length) {
      toast.error("Only the first 10 photos were kept.");
    }

    const prepared: ComposerPhoto[] = [];
    for (const file of acceptedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 10 MB.`);
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
        status: "queued",
      });
    }

    if (prepared.length === 0) return;

    setPhotos((current) => [...current, ...prepared]);
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
      setPhotos((current) =>
        current.map((item) =>
          item.localId === localId
            ? {
              ...item,
              status: "failed",
              error:
                error instanceof Error ? error.message : "Upload failed.",
            }
            : item,
        ),
      );
    }
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      const target = current[index];
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const next = current.filter((_, currentIndex) => currentIndex !== index);
      setActiveIndex((currentIndex) => {
        if (next.length === 0) return 0;
        return Math.min(currentIndex, next.length - 1);
      });
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-dashed border-border/70 bg-muted/20 transition-colors",
          isDragging && "border-primary bg-primary/5",
        )}
      >
        {photos.length === 0 ? (
          <button
            type="button"
            className="flex min-h-40 w-full flex-col items-center justify-center gap-2 px-4 py-6 text-center"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              void handleFilesSelected(Array.from(event.dataTransfer.files));
            }}
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
              <ImagePlus className="size-5" />
            </span>
            <span className="space-y-1">
              <span className="block text-sm font-semibold text-foreground">
                Add photos if you want
              </span>
              <span className="block text-xs text-muted-foreground">
                Optional. Share food, group shots, or any travel moments from
                this stop. Up to 10 photos.
              </span>
            </span>
            <Button type="button" variant="outline" size="sm">
              Select photos
            </Button>
          </button>
        ) : (
          <div className="space-y-3 p-3">
            <div className="-mx-3 flex justify-center sm:mx-0">
              <div className="relative w-full sm:max-w-sm">
                {activePhoto ? (
                  <img
                    src={activePhoto.previewUrl}
                    alt={activePhoto.file.name}
                    className="max-h-[85dvh] w-full bg-black object-cover"
                  />
                ) : null}
                <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
                  <Badge variant="secondary">
                    {activeIndex + 1} / {photos.length}
                  </Badge>
                  {activePhoto ? (
                    <Badge variant="secondary">
                      {activePhoto.width} x {activePhoto.height}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-2">
                {photos.map((item, index) => (
                  <button
                    key={item.localId}
                    type="button"
                    className={cn(
                      "relative overflow-hidden rounded-lg border transition-transform",
                      activeIndex === index
                        ? "border-primary shadow-sm"
                        : "border-border opacity-80",
                    )}
                    onClick={() => setActiveIndex(index)}
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="h-20 w-20 object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-background/80 px-1.5 py-1 text-[10px]">
                      <span className="truncate">{index + 1}</span>
                      <span className="truncate">
                        {item.status === "uploaded" ? "Ready" : item.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

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

      <div className="space-y-4">
        <p className="text-xs text-black/90">
          Posting to {diveSiteLabel}. Share a memory from this stop. Photos are
          optional and can be anything from the day, even food, group photos,
          or travel moments nearby.
        </p>
        <div className="space-y-2">
          <label
            htmlFor="dive-memory-body"
            className="text-sm font-medium text-foreground"
          >
            Memory
          </label>
          <Textarea
            id="dive-memory-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Share what happened on this dive."
            className="min-h-24"
          />
        </div>
      </div>

      <PhotoUploadStatus
        activePhoto={activePhoto}
        uploadingCount={uploadingCount}
        failedCount={failedCount}
        photoCount={photos.length}
        onRetry={(photo) => void uploadPhoto(photo.localId, photo.file)}
        onRemove={() => removePhoto(activeIndex)}
      />

      <div className="flex flex-wrap justify-between gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={photos.length >= MAX_FILES}
          >
            Add photos (optional)
          </Button>
          <Button
            type="button"
            disabled={!canPublish}
            onClick={() => {
              const mediaIds = photos
                .map((photo) => photo.upload?.id ?? "")
                .filter(Boolean);
              const normalizedSiteLabel = diveSiteLabel.split("·")[0]?.trim() || diveSiteLabel;
              const generatedTitle = body.trim()
                ? body.trim().slice(0, 60)
                : `Memory from ${normalizedSiteLabel}`;
              createMemory.mutate(
                {
                  diveSiteId,
                  title: generatedTitle,
                  body: body.trim() || undefined,
                  mediaIds,
                  visibility: "public",
                },
                {
                  onSuccess: () => {
                    toast.success("Memory published.");
                    onPublished?.();
                  },
                },
              );
            }}
          >
            {createMemory.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            Publish memory
          </Button>
        </div>
      </div>
    </div>
  );
}

function PhotoUploadStatus({
  activePhoto,
  uploadingCount,
  failedCount,
  photoCount,
  onRetry,
  onRemove,
}: {
  activePhoto: ComposerPhoto | null;
  uploadingCount: number;
  failedCount: number;
  photoCount: number;
  onRetry: (photo: ComposerPhoto) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-3">
      {uploadingCount > 0 ? (
        <Alert>
          <LoaderCircle className="size-4 animate-spin" />
          <AlertTitle>Uploading photos</AlertTitle>
          <AlertDescription>
            {uploadingCount} of {photoCount} photo
            {photoCount > 1 ? "s are" : " is"} still uploading.
          </AlertDescription>
        </Alert>
      ) : null}

      {failedCount > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Some uploads failed</AlertTitle>
          <AlertDescription>
            Remove failed files or retry them before publishing.
          </AlertDescription>
        </Alert>
      ) : null}

      {activePhoto ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 p-3">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm text-muted-foreground">
              {activePhoto.file.name}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="w-fit">
                {activePhoto.status === "uploaded"
                  ? "Upload complete"
                  : activePhoto.status}
              </Badge>
              {activePhoto.error ? (
                <p className="text-sm text-destructive">{activePhoto.error}</p>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            {activePhoto.status === "failed" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRetry(activePhoto)}
              >
                <RefreshCcw className="size-4" />
                Retry
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <Alert>
          <AlertTitle>No photos selected yet</AlertTitle>
          <AlertDescription>
            Add photos first. Upload starts immediately after selection.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function createLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectURL = URL.createObjectURL(file);
    image.onload = () => {
      resolve({ width: image.width, height: image.height });
      URL.revokeObjectURL(objectURL);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectURL);
      reject(new Error("Unable to read image dimensions."));
    };
    image.src = objectURL;
  });
}
