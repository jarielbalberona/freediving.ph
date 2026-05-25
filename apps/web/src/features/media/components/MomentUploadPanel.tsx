"use client";

import { Film, LoaderCircle, UploadCloud } from "lucide-react";
import type { SyntheticEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DiveSiteCombobox,
  formatDiveSiteOptionLabel,
} from "@/features/diveSpots/components/DiveSiteCombobox";
import {
  useCompleteMomentUpload,
  useCreateMomentUploadIntent,
  useSyncMomentStatus,
} from "@/features/media/hooks";
import type { ExploreSiteCard } from "@freediving.ph/types";

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 30;
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);
const ALLOWED_VIDEO_EXTENSIONS = new Set(["mp4", "mov"]);

type UploadState = "idle" | "uploading" | "processing" | "ready" | "failed";

export function MomentUploadPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [site, setSite] = useState<ExploreSiteCard | null>(null);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<UploadState>("idle");
  const [postId, setPostId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const createIntent = useCreateMomentUploadIntent();
  const completeUpload = useCompleteMomentUpload();
  const syncStatus = useSyncMomentStatus();

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setDurationSeconds(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setDurationSeconds(null);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  function chooseFile(nextFile: File | null) {
    if (!nextFile) return;
    const error = validateSelectedVideo(nextFile);
    if (error) {
      setFile(null);
      setValidationError(error);
      toast.error(error);
      return;
    }
    setValidationError(null);
    setFile(nextFile);
    setState("idle");
    setProgress(0);
  }

  function handleLoadedMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    const nextDuration = event.currentTarget.duration;
    if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
      setDurationSeconds(null);
      return;
    }
    setDurationSeconds(nextDuration);
    if (nextDuration > MAX_VIDEO_SECONDS) {
      setValidationError("Trim your video before uploading.");
      return;
    }
    setValidationError(null);
  }

  async function uploadMoment() {
    if (!file) {
      toast.error("Choose a video first.");
      return;
    }
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (durationSeconds !== null && durationSeconds > MAX_VIDEO_SECONDS) {
      toast.error("Trim your video before uploading.");
      return;
    }
    setState("uploading");
    setProgress(0);
    try {
      const intent = await createIntent.mutateAsync({
        caption: caption.trim() || null,
        diveSiteId: site?.id ?? null,
        filename: file.name,
        contentType: file.type,
      });
      setPostId(intent.postId);
      await uploadToCloudflare(intent.uploadUrl, file, setProgress);
      const completed = await completeUpload.mutateAsync(intent.postId);
      setState(completed.status === "ready" ? "ready" : "processing");
      toast.success(
        completed.status === "ready"
          ? "Moment published."
          : "Your Moment is processing and will appear once it's ready.",
      );
    } catch (error) {
      setState("failed");
      toast.error(
        error instanceof Error
          ? error.message
          : "We couldn't process this Moment. Please try another video.",
      );
    }
  }

  async function refreshStatus() {
    if (!postId) return;
    const result = await syncStatus.mutateAsync(postId);
    setState(result.status === "ready" ? "ready" : result.status === "failed" ? "failed" : "processing");
    if (result.status === "ready") toast.success("Moment is ready.");
    if (result.status === "failed") {
      toast.error("We couldn't process this Moment. Please try another video.");
    }
  }

  const busy =
    createIntent.isPending ||
    completeUpload.isPending ||
    syncStatus.isPending ||
    state === "uploading";
  const uploadDisabled =
    !file || busy || validationError !== null || durationSeconds === null;

  return (
    <Card className="rounded-[0.5rem]">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-sky-500/10 text-sky-800">
            <Film className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Create a Moment</h2>
            <p className="text-sm text-muted-foreground">
              Share one short video, up to 30 seconds.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="moment-video">Video</Label>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Moments can be up to 30 seconds.</p>
            <p>Choose an MP4 or MOV video.</p>
          </div>
          <input
            ref={inputRef}
            id="moment-video"
            type="file"
            accept="video/mp4,video/quicktime,.mp4,.mov"
            className="hidden"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <UploadCloud className="size-4" />
            {file ? file.name : "Choose video"}
          </Button>
        </div>

        {file && previewUrl ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-[0.5rem] border border-border bg-muted/20">
              <video
                src={previewUrl}
                controls
                muted
                playsInline
                preload="metadata"
                className="aspect-video w-full bg-black object-contain"
                onLoadedMetadata={handleLoadedMetadata}
              />
            </div>
            <dl className="grid gap-2 rounded-[0.5rem] border border-border/70 p-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">File</dt>
                <dd className="break-words font-medium">{file.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Size</dt>
                <dd className="font-medium">{formatFileSizeMB(file.size)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="font-medium">
                  {durationSeconds === null
                    ? "Reading video"
                    : formatDuration(durationSeconds)}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        {validationError ? (
          <Alert variant="destructive">
            <AlertTitle>Moment cannot be uploaded</AlertTitle>
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="moment-caption">Caption</Label>
          <Textarea
            id="moment-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Add a caption"
            disabled={busy}
          />
        </div>

        <DiveSiteCombobox
          id="moment-dive-site"
          value={site?.id ?? ""}
          valueLabel={site ? formatDiveSiteOptionLabel(site) : undefined}
          onValueChange={(_, selectedSite) => setSite(selectedSite)}
          searchPlaceholder="Attach a dive site"
          disabled={busy}
        />

        {state === "uploading" ? (
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-sky-600 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}

        {state === "processing" ? (
          <Alert>
            <AlertTitle>Your Moment is processing</AlertTitle>
            <AlertDescription>
              It will appear on your profile and in the feed once it's ready.
            </AlertDescription>
          </Alert>
        ) : null}

        {state === "failed" ? (
          <Alert variant="destructive">
            <AlertTitle>Moment failed</AlertTitle>
            <AlertDescription>
              We couldn't process this Moment. Please try another video.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={uploadMoment} disabled={uploadDisabled}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Upload Moment
          </Button>
          {postId && state === "processing" ? (
            <Button type="button" variant="outline" onClick={refreshStatus}>
              Check status
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function validateSelectedVideo(file: File): string | null {
  if (!isAllowedVideoFile(file)) {
    return "Choose an MP4 or MOV video.";
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return "Moments must be 200 MB or smaller.";
  }
  return null;
}

function isAllowedVideoFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const hasAllowedExtension = ALLOWED_VIDEO_EXTENSIONS.has(extension);
  if (!file.type) {
    return hasAllowedExtension;
  }
  return (
    file.type.startsWith("video/") &&
    (ALLOWED_VIDEO_TYPES.has(file.type) || hasAllowedExtension)
  );
}

function formatFileSizeMB(sizeBytes: number): string {
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  return `${Math.round(seconds)} seconds`;
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
