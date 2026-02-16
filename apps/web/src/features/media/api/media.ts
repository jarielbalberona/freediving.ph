import { axiosInstance } from '@/lib/http/axios';
import type { ApiEnvelope } from '@freediving.ph/types';
import type {
  Media,
  CreateMediaRequest,
  UpdateMediaRequest,
  PresignedUrlRequest,
  PresignedUrlResponse,
  MediaFilters
} from '../types';

export const mediaApi = {
  getPresignedUrl: async (data: PresignedUrlRequest): Promise<PresignedUrlResponse> => {
    const response = await axiosInstance.get<ApiEnvelope<PresignedUrlResponse>>(`/media/presigned-url/${data.username}`, {
      params: {
        filename: data.filename,
        mimeType: data.mimeType,
        size: data.size
      }
    });
    return response.data.data;
  },

  uploadMedia: async (data: CreateMediaRequest): Promise<Media> => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.altText) formData.append('altText', data.altText);
    if (data.caption) formData.append('caption', data.caption);
    if (data.tags) formData.append('tags', JSON.stringify(data.tags));
    formData.append('category', data.category);
    formData.append('isPublic', data.isPublic.toString());

    const response = await axiosInstance.post<ApiEnvelope<Media>>('/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  getMedia: async (filters?: MediaFilters): Promise<Media[]> => {
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

    const response = await axiosInstance.get<ApiEnvelope<Media[]>>(url);
    return response.data.data;
  },

  getMediaById: async (mediaId: number): Promise<Media> => {
    const response = await axiosInstance.get<ApiEnvelope<Media>>(`/media/${mediaId}`);
    return response.data.data;
  },

  updateMedia: async (mediaId: number, data: UpdateMediaRequest): Promise<Media> => {
    const response = await axiosInstance.put<ApiEnvelope<Media>>(`/media/${mediaId}`, data);
    return response.data.data;
  },

  deleteMedia: async (mediaId: number): Promise<void> => {
    await axiosInstance.delete(`/media/${mediaId}`);
  },
};
