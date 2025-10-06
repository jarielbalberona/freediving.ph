import { axiosInstance } from '@/lib/http/axios';
import type {
  User,
  UserProfile,
  UpdateUserRequest,
  UserFilters
} from '../types';

export const userApi = {
  // Get all users (admin only)
  getUsers: (filters?: UserFilters) => {
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

    return axiosInstance.get<{
      success: boolean;
      data: {
        users: User[];
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

  // Get current user profile
  getCurrentUser: () => {
    return axiosInstance.get<{
      success: boolean;
      data: UserProfile;
    }>('/users/me');
  },

  // Get user by ID
  getUserById: (userId: number) => {
    return axiosInstance.get<{
      success: boolean;
      data: UserProfile;
    }>(`/users/${userId}`);
  },

  // Update current user
  updateCurrentUser: (data: UpdateUserRequest) => {
    return axiosInstance.put<{
      success: boolean;
      data: UserProfile;
    }>('/users/me', data);
  },

  // Delete current user
  deleteCurrentUser: () => {
    return axiosInstance.delete<{
      success: boolean;
      message: string;
    }>('/users/me');
  },

  // Export users (admin only)
  exportUsers: () => {
    return axiosInstance.get<{
      success: boolean;
      data: {
        downloadUrl: string;
        expiresAt: string;
      };
    }>('/users/export');
  },
};
