"use client";

import type { MediaUploadResponse } from "@freediving.ph/types";

import { Card, CardContent } from "@/components/ui/card";

interface MediaCardProps {
  media: MediaUploadResponse;
  imageUrl?: string;
  onSelect?: (media: MediaUploadResponse) => void;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function MediaCard({ media, imageUrl, onSelect }: MediaCardProps) {
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => onSelect?.(media)}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={media.objectKey}
            className="h-48 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center bg-muted text-sm text-muted-foreground">
            Loading preview...
          </div>
        )}
        <CardContent className="space-y-1 p-3">
          <p className="truncate text-sm font-medium">{media.contextType}</p>
          <p className="text-xs text-muted-foreground">
            {media.width}x{media.height} • {formatSize(media.sizeBytes)}
          </p>
        </CardContent>
      </button>
    </Card>
  );
}
