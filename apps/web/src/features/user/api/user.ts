import { axiosInstance } from '@/lib/http/axios';
import type { ApiEnvelope } from '@freediving.ph/types';
import type {
  User,
  UserProfile,
  UpdateUserRequest,
  UserFilters
} from '../types';

export const userApi = {
  getUsers: async (filters?: UserFilters): Promise<User[]> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.experience) params.append('experience', filters.experience);
    if (filters?.role) params.append('role', filters.role);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters?.isVerified !== undefined) params.append('isVerified', filters.isVerified.toString());

    const queryString = params.toString();
    const url = `/users${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<ApiEnvelope<User[]>>(url);
    return response.data.data;
  },

  getCurrentUser: async (): Promise<UserProfile> => {
    const response = await axiosInstance.get<ApiEnvelope<UserProfile>>('/auth/me');
    return response.data.data;
  },

  getUserById: async (userId: number): Promise<UserProfile> => {
    const response = await axiosInstance.get<ApiEnvelope<UserProfile>>(`/auth/${userId}`);
    return response.data.data;
  },

  updateCurrentUser: async (data: UpdateUserRequest): Promise<UserProfile> => {
    const response = await axiosInstance.put<ApiEnvelope<UserProfile>>('/auth/profile', data);
    return response.data.data;
  },

  deleteCurrentUser: async (): Promise<void> => {
    await axiosInstance.delete('/users');
  },

  exportUsers: async (): Promise<string> => {
    const response = await axiosInstance.get<ApiEnvelope<string>>('/users/export');
    return response.data.data;
  },
};
