import { axiosInstance } from '@/lib/http/axios';
import type { ApiEnvelope } from '@freediving.ph/types';
import type {
  UserService,
  ServiceBooking,
  ServiceReview,
  CreateServiceRequest,
  UpdateServiceRequest,
  CreateBookingRequest,
  UpdateBookingStatusRequest,
  CreateReviewRequest,
  ServiceFilters
} from '@freediving.ph/types';

export const userServicesApi = {
  getServices: async (filters?: ServiceFilters): Promise<UserService[]> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.category) params.append('category', filters.category);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters?.availability) params.append('availability', filters.availability);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.providerId) params.append('providerId', filters.providerId.toString());
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());

    const queryString = params.toString();
    const url = `/user-services${queryString ? `?${queryString}` : ''}`;

    const response = await axiosInstance.get<ApiEnvelope<UserService[]>>(url);
    return response.data.data;
  },

  getServiceById: async (serviceId: number): Promise<UserService> => {
    const response = await axiosInstance.get<ApiEnvelope<UserService>>(`/user-services/${serviceId}`);
    return response.data.data;
  },

  createService: async (data: CreateServiceRequest): Promise<UserService> => {
    const response = await axiosInstance.post<ApiEnvelope<UserService>>('/user-services', data);
    return response.data.data;
  },

  updateService: async (serviceId: number, data: UpdateServiceRequest): Promise<UserService> => {
    const response = await axiosInstance.put<ApiEnvelope<UserService>>(`/user-services/${serviceId}`, data);
    return response.data.data;
  },

  getUserServices: async (userId: number): Promise<UserService[]> => {
    const response = await axiosInstance.get<ApiEnvelope<UserService[]>>(`/user-services/users/${userId}`);
    return response.data.data;
  },

  createBooking: async (data: CreateBookingRequest): Promise<ServiceBooking> => {
    const response = await axiosInstance.post<ApiEnvelope<ServiceBooking>>('/user-services/bookings', data);
    return response.data.data;
  },

  getServiceBookings: async (serviceId: number): Promise<ServiceBooking[]> => {
    const response = await axiosInstance.get<ApiEnvelope<ServiceBooking[]>>(`/user-services/${serviceId}/bookings`);
    return response.data.data;
  },

  getUserBookings: async (userId: number): Promise<ServiceBooking[]> => {
    const response = await axiosInstance.get<ApiEnvelope<ServiceBooking[]>>(`/user-services/users/${userId}/bookings`);
    return response.data.data;
  },

  updateBookingStatus: async (bookingId: number, data: UpdateBookingStatusRequest): Promise<ServiceBooking> => {
    const response = await axiosInstance.put<ApiEnvelope<ServiceBooking>>(`/user-services/bookings/${bookingId}/status`, data);
    return response.data.data;
  },

  createReview: async (data: CreateReviewRequest): Promise<ServiceReview> => {
    const response = await axiosInstance.post<ApiEnvelope<ServiceReview>>('/user-services/reviews', data);
    return response.data.data;
  },

  getServiceReviews: async (serviceId: number): Promise<ServiceReview[]> => {
    const response = await axiosInstance.get<ApiEnvelope<ServiceReview[]>>(`/user-services/${serviceId}/reviews`);
    return response.data.data;
  },
};
