import type { ApiEnvelope } from "@freediving.ph/types";

import { axiosInstance } from "@/lib/http/axios";

import type {
  CreatePersonalBestRequest,
  PersonalBest,
  ProfileResponse,
  UpdateOwnProfileRequest,
} from '@freediving.ph/types';

export const profilesApi = {
  getByUsername: async (username: string): Promise<ProfileResponse> => {
    const response = await axiosInstance.get<ApiEnvelope<ProfileResponse>>(`/profiles/${username}`);
    return response.data.data;
  },

  updateOwnProfile: async (payload: UpdateOwnProfileRequest): Promise<ProfileResponse["profile"]> => {
    const response = await axiosInstance.put<ApiEnvelope<ProfileResponse["profile"]>>(`/profiles/me`, payload);
    return response.data.data;
  },

  createPersonalBest: async (payload: CreatePersonalBestRequest): Promise<PersonalBest> => {
    const response = await axiosInstance.post<ApiEnvelope<PersonalBest>>(`/profiles/me/personal-bests`, payload);
    return response.data.data;
  },

  updatePersonalBest: async (id: number, payload: Partial<CreatePersonalBestRequest>): Promise<PersonalBest> => {
    const response = await axiosInstance.put<ApiEnvelope<PersonalBest>>(`/profiles/me/personal-bests/${id}`, payload);
    return response.data.data;
  },

  deletePersonalBest: async (id: number): Promise<PersonalBest> => {
    const response = await axiosInstance.delete<ApiEnvelope<PersonalBest>>(`/profiles/me/personal-bests/${id}`);
    return response.data.data;
  },
};
