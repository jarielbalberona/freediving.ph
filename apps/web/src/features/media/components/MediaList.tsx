"use client";

import { useMedia } from '../hooks';
import { MediaCard } from './MediaCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, ImageIcon } from 'lucide-react';
import type { MediaFilters } from '@freediving.ph/types';

interface MediaListProps {
  filters?: MediaFilters;
  showUploadButton?: boolean;
  onMediaView?: (mediaId: number) => void;
  onMediaEdit?: (mediaId: number) => void;
  onMediaDelete?: (mediaId: number) => void;
  onMediaDownload?: (mediaId: number) => void;
}

export function MediaList({
  filters,
  showUploadButton = false,
  onMediaView,
  onMediaEdit,
  onMediaDelete,
  onMediaDownload
}: MediaListProps) {
  const { data, isLoading, error } = useMedia(filters);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load media. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const media = data ?? [];

  if (media.length === 0) {
    return (
      <div className="text-center py-8">
        <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No media found
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {filters?.search ? 'Try adjusting your search criteria.' : 'No media files are currently available.'}
        </p>
        {showUploadButton && (
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Media
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {media.map((mediaItem) => (
        <MediaCard
          key={mediaItem.id}
          media={mediaItem}
          onView={onMediaView}
          onEdit={onMediaEdit}
          onDelete={onMediaDelete}
          onDownload={onMediaDownload}
          showActions={!!onMediaView || !!onMediaEdit || !!onMediaDelete || !!onMediaDownload}
        />
      ))}
    </div>
  );
}
