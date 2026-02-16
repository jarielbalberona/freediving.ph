import { axiosInstance } from '@/lib/http/axios';
import type { ApiEnvelope } from '@freediving.ph/types';
import type {
  DiveSpot,
  DiveSpotReview,
  CreateDiveSpotRequest,
  UpdateDiveSpotRequest,
  CreateDiveSpotReviewRequest,
  DiveSpotFilters
} from '../types';

export const diveSpotsApi = {
  getDiveSpots: async (filters?: DiveSpotFilters): Promise<DiveSpot[]> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.location) params.append('location', filters.location);
    if (filters?.minDepth) params.append('minDepth', filters.minDepth.toString());
    if (filters?.maxDepth) params.append('maxDepth', filters.maxDepth.toString());
    if (filters?.visibility) params.append('visibility', filters.visibility);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.waterType) params.append('waterType', filters.waterType);
    if (filters?.current) params.append('current', filters.current);
    if (filters?.entryType) params.append('entryType', filters.entryType);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.isPublic !== undefined) params.append('isPublic', filters.isPublic.toString());
    if (filters?.isVerified !== undefined) params.append('isVerified', filters.isVerified.toString());
    if (filters?.latitude) params.append('latitude', filters.latitude.toString());
    if (filters?.longitude) params.append('longitude', filters.longitude.toString());
    if (filters?.radius) params.append('radius', filters.radius.toString());

    const queryString = params.toString();
    const url = `/dive-spots${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<ApiEnvelope<DiveSpot[]>>(url);
    return response.data.data;
  },

  getDiveSpotById: async (diveSpotId: number): Promise<DiveSpot> => {
    const response = await axiosInstance.get<ApiEnvelope<DiveSpot>>(`/dive-spots/${diveSpotId}`);
    return response.data.data;
  },

  // Create new dive spot
  createDiveSpot: async (data: CreateDiveSpotRequest): Promise<DiveSpot> => {
    const response = await axiosInstance.post<ApiEnvelope<DiveSpot>>('/dive-spots', data);
    return response.data.data;
  },

  // Update dive spot
  updateDiveSpot: async (diveSpotId: number, data: UpdateDiveSpotRequest): Promise<DiveSpot> => {
    const response = await axiosInstance.put<ApiEnvelope<DiveSpot>>(`/dive-spots/${diveSpotId}`, data);
    return response.data.data;
  },

  // Get dive spot reviews
  getDiveSpotReviews: async (diveSpotId: number): Promise<DiveSpotReview[]> => {
    const response = await axiosInstance.get<ApiEnvelope<DiveSpotReview[]>>(`/dive-spots/${diveSpotId}/reviews`);
    return response.data.data;
  },

  // Create dive spot review
  createDiveSpotReview: async (data: CreateDiveSpotReviewRequest): Promise<DiveSpotReview> => {
    const response = await axiosInstance.post<ApiEnvelope<DiveSpotReview>>(`/dive-spots/${data.diveSpotId}/reviews`, data);
    return response.data.data;
  },
};
