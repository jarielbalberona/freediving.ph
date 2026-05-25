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
  Film,
  ImagePlus,
  LoaderCircle,
  RefreshCcw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DiveSiteCombobox,
  formatDiveSiteOptionLabel,
} from "@/features/diveSpots/components/DiveSiteCombobox";
import {
  useCompleteMomentUpload,
  useCreateMediaPost,
  useCreateMomentUploadIntent,
  useSyncMomentStatus,
  useUploadMedia,
} from "@/features/media/hooks";
import {
  SelectedVideoPreview,
  validateMomentDuration,
  validateSelectedMomentVideo,
} from "@/features/media/components/SelectedVideoPreview";
import { createMediaPostSchema } from "@/features/media/schemas/create-media-post.schema";
import { getProfileRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

type ProfileMediaComposerProps = {
  username: string;
  onPublished?: () => void;
};

type UploadStatus = "queued" | "uploading" | "uploaded" | "failed";
type ComposerMode = "photos" | "moments";
type MomentUploadState =
  | "idle"
  | "uploading"
  | "processing"
  | "ready"
  | "failed";

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
const MAX_FILE_SIZE = 10 * 1024 * 1024;
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
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const photosRef = useRef<ComposerPhoto[]>([]);
  const [mode, setMode] = useState<ComposerMode>("photos");
  const [photos, setPhotos] = useState<ComposerPhoto[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedDiveSite, setSelectedDiveSite] =
    useState<ExploreSiteCard | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<
    number | null
  >(null);
  const [videoValidationError, setVideoValidationError] = useState<
    string | null
  >(null);
  const [momentProgress, setMomentProgress] = useState(0);
  const [momentState, setMomentState] = useState<MomentUploadState>("idle");
  const [momentPostId, setMomentPostId] = useState<string | null>(null);
  const uploadMutation = useUploadMedia();
  const createPostMutation = useCreateMediaPost();
  const createMomentIntent = useCreateMomentUploadIntent();
  const completeMomentUpload = useCompleteMomentUpload();
  const syncMomentStatus = useSyncMomentStatus();

  const form = useForm<CreateMediaPostValues>({
    resolver: zodResolver(createMediaPostSchema),
    mode: "onChange",
    defaultValues: {
      diveSiteId: "",
      postCaption: "",
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
  const momentBusy =
    createMomentIntent.isPending ||
    completeMomentUpload.isPending ||
    syncMomentStatus.isPending ||
    momentState === "uploading";
  const canUploadMoment =
    Boolean(videoFile) &&
    !momentBusy &&
    videoValidationError === null &&
    videoDurationSeconds !== null;

  const handleVideoDurationChange = useCallback(
    (nextDuration: number | null) => {
      setVideoDurationSeconds(nextDuration);
      setVideoValidationError(validateMomentDuration(nextDuration));
    },
    [],
  );

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
        status: "queued" as const,
      });
    }

    if (prepared.length === 0) return;

    setPhotos((current) => [...current, ...prepared]);
    fieldArray.append(
      prepared.map((item) => ({
        localId: item.localId,
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

  function chooseVideo(nextFile: File | null) {
    if (!nextFile) return;
    const error = validateSelectedMomentVideo(nextFile);
    if (error) {
      setVideoFile(null);
      setVideoDurationSeconds(null);
      setVideoValidationError(error);
      toast.error(error);
      return;
    }
    setVideoValidationError(null);
    setVideoDurationSeconds(null);
    setVideoFile(nextFile);
    setMomentState("idle");
    setMomentProgress(0);
    setMomentPostId(null);
  }

  async function uploadMoment() {
    if (!videoFile) {
      toast.error("Choose a video first.");
      return;
    }
    if (videoValidationError) {
      toast.error(videoValidationError);
      return;
    }
    const durationError = validateMomentDuration(videoDurationSeconds);
    if (durationError) {
      toast.error(durationError);
      return;
    }
    if (videoDurationSeconds === null) {
      toast.error("Trim your video before uploading.");
      return;
    }
    const values = form.getValues();
    if (!values.diveSiteId) {
      form.setError("diveSiteId", { message: "Choose a dive site" });
      return;
    }

    setMomentState("uploading");
    setMomentProgress(0);
    try {
      const intent = await createMomentIntent.mutateAsync({
        caption: values.postCaption?.trim() || null,
        diveSiteId: values.diveSiteId,
        filename: videoFile.name,
        contentType: videoFile.type,
      });
      setMomentPostId(intent.postId);
      await uploadToCloudflare(intent.uploadUrl, videoFile, setMomentProgress);
      const completed = await completeMomentUpload.mutateAsync(intent.postId);
      setMomentState(completed.status === "ready" ? "ready" : "processing");
      toast.success(
        completed.status === "ready"
          ? "Moment published."
          : "Your Moment is processing and will appear once it's ready.",
      );
      if (completed.status === "ready") {
        onPublished?.();
      }
    } catch (error) {
      setMomentState("failed");
      toast.error(
        error instanceof Error
          ? error.message
          : "We couldn't process this Moment. Please try another video.",
      );
    }
  }

  async function refreshMomentStatus() {
    if (!momentPostId) return;
    const result = await syncMomentStatus.mutateAsync(momentPostId);
    setMomentState(
      result.status === "ready"
        ? "ready"
        : result.status === "failed"
          ? "failed"
          : "processing",
    );
    if (result.status === "ready") {
      toast.success("Moment is ready.");
      onPublished?.();
    }
    if (result.status === "failed") {
      toast.error("We couldn't process this Moment. Please try another video.");
    }
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
        applyCaptionToAll: false,
        source: "create_post",
        items: uploadedPhotos.map((item, index) => ({
          mediaObjectId: item.upload!.id,
          type: "photo",
          storageKey: item.upload!.objectKey,
          mimeType: item.upload!.mimeType,
          width: item.upload!.width || item.width,
          height: item.upload!.height || item.height,
          caption: null,
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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Publish to @{username}
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            Location is required. Caption applies to Photos and Moments.
          </p>
        </div>

        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as ComposerMode)}
          className="gap-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="moments">Moments</TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="space-y-3">
            <div
              className={cn(
                "overflow-hidden rounded-xl border border-dashed border-border/70 bg-muted/20 transition-colors",
                isDragging && "border-primary bg-primary/5",
              )}
            >
              {photos.length === 0 ? (
                <button
                  type="button"
                  className="flex min-h-80 w-full flex-col items-center justify-center gap-3 px-4 text-center"
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
                  <span className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                    <ImagePlus className="size-5" />
                  </span>
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold text-foreground">
                      Drag photos here or choose files
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Upload 1 to 10 photos. Each file must be 10 MB or smaller.
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
          </TabsContent>

          <TabsContent value="moments" className="space-y-3">
            <Alert>
              <AlertCircle className="size-4" />
              <AlertTitle>Moments are still in progress</AlertTitle>
              <AlertDescription>
                You can test choosing and previewing a video, but uploading may
                not work yet.
              </AlertDescription>
            </Alert>

            {!videoFile ? (
              <div className="overflow-hidden rounded-xl border border-dashed border-border/70 bg-muted/20">
                <button
                  type="button"
                  className="flex min-h-80 w-full flex-col items-center justify-center gap-3 px-4 text-center"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={momentBusy}
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                    <Film className="size-5" />
                  </span>
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold text-foreground">
                      Choose a Moment video
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Moments can be up to 30 seconds.
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Choose an MP4 or MOV video.
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={momentBusy}
                  >
                    <UploadCloud className="size-4" />
                    Choose video
                  </Button>
                </button>
              </div>
            ) : null}

            <input
              ref={videoInputRef}
              id="moment-video"
              type="file"
              accept="video/mp4,video/quicktime,.mp4,.mov"
              className="hidden"
              onChange={(event) => {
                chooseVideo(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />

            {videoFile ? (
              <SelectedVideoPreview
                file={videoFile}
                onDurationChange={handleVideoDurationChange}
                className="-mx-3 sm:mx-0"
              />
            ) : null}

            {videoFile ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={momentBusy}
                >
                  <UploadCloud className="size-4" />
                  Change video
                </Button>
              </div>
            ) : null}

            {videoValidationError ? (
              <Alert variant="destructive">
                <AlertTitle>Moment cannot be uploaded</AlertTitle>
                <AlertDescription>{videoValidationError}</AlertDescription>
              </Alert>
            ) : null}

            {momentState === "uploading" ? (
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-sky-600 transition-[width]"
                  style={{ width: `${momentProgress}%` }}
                />
              </div>
            ) : null}
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="diveSiteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dive site</FormLabel>
                <FormControl>
                  <DiveSiteCombobox
                    value={field.value}
                    valueLabel={
                      selectedDiveSite
                        ? formatDiveSiteOptionLabel(selectedDiveSite)
                        : undefined
                    }
                    limit={12}
                    onValueChange={(value, site) => {
                      field.onChange(value);
                      setSelectedDiveSite(site);
                    }}
                    disabled={createPostMutation.isPending || momentBusy}
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
            name="postCaption"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Caption</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Optional caption for this post"
                    className="min-h-24"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This caption appears on the selected post type.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {mode === "photos" ? (
          <PhotoUploadStatus
            activePhoto={activePhoto}
            uploadingCount={uploadingCount}
            failedCount={failedCount}
            photoCount={photos.length}
            onRetry={(photo) => void uploadPhoto(photo.localId, photo.file)}
            onRemove={() => removePhoto(activeIndex)}
          />
        ) : (
          <MomentUploadStatus
            state={momentState}
            postId={momentPostId}
            onRefresh={() => void refreshMomentStatus()}
          />
        )}

        <div className="flex flex-wrap justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(getProfileRoute(username))}
          >
            Cancel
          </Button>
          <div className="flex flex-wrap justify-end gap-2">
            {mode === "photos" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                  disabled={photos.length >= MAX_FILES}
                >
                  Add photos
                </Button>
                <Button type="submit" disabled={!canPublish}>
                  {createPostMutation.isPending
                    ? "Publishing..."
                    : "Publish photos"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={uploadMoment}
                disabled={!canUploadMoment}
              >
                {momentBusy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                Upload Moment
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
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
          <AlertCircle className="size-4" />
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
          <AlertCircle className="size-4" />
          <AlertTitle>No photos selected yet</AlertTitle>
          <AlertDescription>
            Add photos first. Upload starts immediately after selection.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function MomentUploadStatus({
  state,
  postId,
  onRefresh,
}: {
  state: MomentUploadState;
  postId: string | null;
  onRefresh: () => void;
}) {
  if (state === "processing") {
    return (
      <Alert>
        <AlertTitle>Your Moment is processing</AlertTitle>
        <AlertDescription>
          It will appear on your profile and in the feed once it's ready.
          {postId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-fit"
              onClick={onRefresh}
            >
              Check status
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  if (state === "failed") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Moment failed</AlertTitle>
        <AlertDescription>
          We couldn't process this Moment. Please try another video.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
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

function uploadToCloudflare(
  uploadUrl: string,
  file: File,
  onProgress: (progress: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error("Moment upload failed."));
      }
    };
    xhr.onerror = () => reject(new Error("Moment upload failed."));
    xhr.send(formData);
  });
}
