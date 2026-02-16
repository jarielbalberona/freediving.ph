"use client";

import { Media } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Eye, Edit, Trash2, Image, Video, File, Music } from 'lucide-react';
import { useState } from 'react';

interface MediaCardProps {
  media: Media;
  onView?: (mediaId: number) => void;
  onEdit?: (mediaId: number) => void;
  onDelete?: (mediaId: number) => void;
  onDownload?: (mediaId: number) => void;
  showActions?: boolean;
}

export function MediaCard({
  media,
  onView,
  onEdit,
  onDelete,
  onDownload,
  showActions = true
}: MediaCardProps) {
  const [imageError, setImageError] = useState(false);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'IMAGE':
        return <Image className="h-4 w-4" />;
      case 'VIDEO':
        return <Video className="h-4 w-4" />;
      case 'AUDIO':
        return <Music className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'IMAGE':
        return 'default';
      case 'VIDEO':
        return 'secondary';
      case 'AUDIO':
        return 'outline';
      case 'DOCUMENT':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg line-clamp-2">{media.originalName}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getCategoryColor(media.category)}>
                {getCategoryIcon(media.category)}
                <span className="ml-1">{media.category}</span>
              </Badge>
              {media.isPublic ? (
                <Badge variant="outline" className="text-xs">
                  Public
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Private
                </Badge>
              )}
            </div>
          </div>
          {showActions && (
            <div className="flex gap-2">
              {onView && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onView(media.id)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(media.id)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(media.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {onDownload && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDownload(media.id)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Media Preview */}
        {media.category === 'IMAGE' && media.thumbnailUrl && !imageError ? (
          <div className="mb-4">
            <img
              src={media.thumbnailUrl}
              alt={media.altText || media.originalName}
              className="w-full h-32 object-cover rounded-md"
              onError={() => setImageError(true)}
            />
          </div>
        ) : media.category === 'VIDEO' && media.thumbnailUrl ? (
          <div className="mb-4">
            <div className="relative w-full h-32 bg-gray-100 rounded-md flex items-center justify-center">
              <Video className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center">
              {getCategoryIcon(media.category)}
            </div>
          </div>
        )}

        {media.caption && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
            {media.caption}
          </p>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Size: {formatFileSize(media.size)}</span>
            <span>{formatDate(media.createdAt)}</span>
          </div>

          {media.metadata && (
            <div className="space-y-1">
              {media.metadata.width && media.metadata.height && (
                <div>Dimensions: {media.metadata.width} × {media.metadata.height}</div>
              )}
              {media.metadata.duration && (
                <div>Duration: {Math.round(media.metadata.duration)}s</div>
              )}
              {media.metadata.format && (
                <div>Format: {media.metadata.format}</div>
              )}
            </div>
          )}

          <div className="text-xs">
            Uploaded by {media.uploadedByName}
          </div>
        </div>

        {media.tags && media.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {media.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {media.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{media.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
