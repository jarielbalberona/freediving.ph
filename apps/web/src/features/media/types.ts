export interface Media {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  caption?: string;
  tags?: string[];
  category: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'OTHER';
  uploadedBy: number;
  uploadedByName: string;
  isPublic: boolean;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
    quality?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateMediaRequest {
  file: File;
  altText?: string;
  caption?: string;
  tags?: string[];
  category: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'OTHER';
  isPublic: boolean;
}

export interface UpdateMediaRequest {
  altText?: string;
  caption?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface PresignedUrlRequest {
  username: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export interface MediaFilters {
  page?: number;
  limit?: number;
  category?: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'OTHER';
  uploadedBy?: number;
  isPublic?: boolean;
  search?: string;
  tags?: string[];
}
