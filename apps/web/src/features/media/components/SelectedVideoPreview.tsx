"use client";

import type { SyntheticEvent } from "react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export const MAX_MOMENT_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_MOMENT_VIDEO_SECONDS = 30;

const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime"]);
const ALLOWED_VIDEO_EXTENSIONS = new Set(["mp4", "mov"]);

type SelectedVideoPreviewProps = {
  file: File;
  onDurationChange: (durationSeconds: number | null) => void;
  className?: string;
  videoClassName?: string;
};

export function SelectedVideoPreview({
  file,
  onDurationChange,
  className,
  videoClassName,
}: SelectedVideoPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setAspectRatio(null);
    onDurationChange(null);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, onDurationChange]);

  function handleLoadedMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    const nextDuration = video.duration;
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setAspectRatio(`${video.videoWidth} / ${video.videoHeight}`);
    }
    if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
      onDurationChange(null);
      return;
    }
    onDurationChange(nextDuration);
  }

  return (
    <div className={cn("flex justify-center", className)}>
      {previewUrl ? (
        <video
          src={previewUrl}
          controls
          muted
          playsInline
          preload="metadata"
          style={aspectRatio ? { aspectRatio } : undefined}
          className={cn(
            "h-auto max-h-[70vh] w-full bg-black object-cover sm:max-w-sm",
            videoClassName,
          )}
          onLoadedMetadata={handleLoadedMetadata}
        />
      ) : null}
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
