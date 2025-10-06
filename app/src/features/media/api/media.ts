import { axiosInstance } from '@/lib/http/axios';
import type {
  Media,
  CreateMediaRequest,
  UpdateMediaRequest,
  PresignedUrlRequest,
  PresignedUrlResponse,
  MediaFilters
} from '../types';

export const mediaApi = {
  // Get presigned URL for direct upload
  getPresignedUrl: (data: PresignedUrlRequest) => {
    return axiosInstance.get<{
      success: boolean;
      data: PresignedUrlResponse;
    }>(`/media/presigned-url/${data.username}`, {
      params: {
        filename: data.filename,
        mimeType: data.mimeType,
        size: data.size
      }
    });
  },

  // Upload media file (multipart form data)
  uploadMedia: (data: CreateMediaRequest) => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.altText) formData.append('altText', data.altText);
    if (data.caption) formData.append('caption', data.caption);
    if (data.tags) formData.append('tags', JSON.stringify(data.tags));
    formData.append('category', data.category);
    formData.append('isPublic', data.isPublic.toString());

    return axiosInstance.post<{
      success: boolean;
      data: Media;
    }>('/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get all media with pagination and filtering
  getMedia: (filters?: MediaFilters) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.category) params.append('category', filters.category);
    if (filters?.uploadedBy) params.append('uploadedBy', filters.uploadedBy.toString());
    if (filters?.isPublic !== undefined) params.append('isPublic', filters.isPublic.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.tags) params.append('tags', filters.tags.join(','));

    const queryString = params.toString();
    const url = `/media${queryString ? `?${queryString}` : ''}`;

    return axiosInstance.get<{
      success: boolean;
      data: {
        media: Media[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      };
    }>(url);
  },

  // Get media by ID
  getMediaById: (mediaId: number) => {
    return axiosInstance.get<{
      success: boolean;
      data: Media;
    }>(`/media/${mediaId}`);
  },

  // Update media
  updateMedia: (mediaId: number, data: UpdateMediaRequest) => {
    return axiosInstance.put<{
      success: boolean;
      data: Media;
    }>(`/media/${mediaId}`, data);
  },

  // Delete media
  deleteMedia: (mediaId: number) => {
    return axiosInstance.delete<{
      success: boolean;
      message: string;
    }>(`/media/${mediaId}`);
  },
};
