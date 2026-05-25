"use client";

import type { SyntheticEvent } from "react";
import { useEffect, useState } from "react";

export const MAX_MOMENT_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_MOMENT_VIDEO_SECONDS = 30;

const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);
const ALLOWED_VIDEO_EXTENSIONS = new Set(["mp4", "mov"]);

type SelectedVideoPreviewProps = {
  file: File;
  onDurationChange: (durationSeconds: number | null) => void;
};

export function SelectedVideoPreview({
  file,
  onDurationChange,
}: SelectedVideoPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setDurationSeconds(null);
    onDurationChange(null);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, onDurationChange]);

  function handleLoadedMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    const nextDuration = event.currentTarget.duration;
    if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
      setDurationSeconds(null);
      onDurationChange(null);
      return;
    }
    setDurationSeconds(nextDuration);
    onDurationChange(nextDuration);
  }

  return (
    <div className="space-y-3">
      {previewUrl ? (
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
      ) : null}
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
  );
}

export function validateSelectedMomentVideo(file: File): string | null {
  if (!isAllowedMomentVideoFile(file)) {
    return "Choose an MP4 or MOV video.";
  }
  if (file.size > MAX_MOMENT_VIDEO_BYTES) {
    return "Moments must be 200 MB or smaller.";
  }
  return null;
}

export function validateMomentDuration(
  durationSeconds: number | null,
): string | null {
  if (durationSeconds !== null && durationSeconds > MAX_MOMENT_VIDEO_SECONDS) {
    return "Trim your video before uploading.";
  }
  return null;
}

function isAllowedMomentVideoFile(file: File): boolean {
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
