import { axiosInstance } from '@/lib/http/axios';
import type {
  DiveSpot,
  DiveSpotReview,
  CreateDiveSpotRequest,
  UpdateDiveSpotRequest,
  CreateDiveSpotReviewRequest,
  DiveSpotFilters
} from '../types';

export const diveSpotsApi = {
  // Get all dive spots with pagination and filtering
  getDiveSpots: (filters?: DiveSpotFilters) => {
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

    return axiosInstance.get<{
      status: number;
      message: string;
      data: DiveSpot[];
    }>(url);
  },

  // Get dive spot by ID
  getDiveSpotById: (diveSpotId: number) => {
    return axiosInstance.get<{
      status: number;
      message: string;
      data: DiveSpot;
    }>(`/dive-spots/${diveSpotId}`);
  },

  // Create new dive spot
  createDiveSpot: (data: CreateDiveSpotRequest) => {
    return axiosInstance.post<{
      status: number;
      message: string;
      data: DiveSpot;
    }>('/dive-spots', data);
  },

  // Update dive spot
  updateDiveSpot: (diveSpotId: number, data: UpdateDiveSpotRequest) => {
    return axiosInstance.put<{
      status: number;
      message: string;
      data: DiveSpot;
    }>(`/dive-spots/${diveSpotId}`, data);
  },

  // Get dive spot reviews
  getDiveSpotReviews: (diveSpotId: number) => {
    return axiosInstance.get<{
      status: number;
      message: string;
      data: DiveSpotReview[];
    }>(`/dive-spots/${diveSpotId}/reviews`);
  },

  // Create dive spot review
  createDiveSpotReview: (data: CreateDiveSpotReviewRequest) => {
    return axiosInstance.post<{
      status: number;
      message: string;
      data: DiveSpotReview;
    }>(`/dive-spots/${data.diveSpotId}/reviews`, data);
  },
};
