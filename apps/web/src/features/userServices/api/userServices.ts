import { axiosInstance } from '@/lib/http/axios';
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
} from '../types';

export const userServicesApi = {
  // Get all services with pagination and filtering
  getServices: (filters?: ServiceFilters) => {
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

    return axiosInstance.get<{
      success: boolean;
      data: {
        services: UserService[];
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

  // Get service by ID
  getServiceById: (serviceId: number) => {
    return axiosInstance.get<{
      success: boolean;
      data: UserService;
    }>(`/user-services/${serviceId}`);
  },

  // Create new service
  createService: (data: CreateServiceRequest) => {
    return axiosInstance.post<{
      success: boolean;
      data: UserService;
    }>('/user-services', data);
  },

  // Update service
  updateService: (serviceId: number, data: UpdateServiceRequest) => {
    return axiosInstance.put<{
      success: boolean;
      data: UserService;
    }>(`/user-services/${serviceId}`, data);
  },

  // Get user services
  getUserServices: (userId: number) => {
    return axiosInstance.get<{
      success: boolean;
      data: UserService[];
    }>(`/user-services/users/${userId}`);
  },

  // Create booking
  createBooking: (data: CreateBookingRequest) => {
    return axiosInstance.post<{
      success: boolean;
      data: ServiceBooking;
    }>('/user-services/bookings', data);
  },

  // Get service bookings
  getServiceBookings: (serviceId: number) => {
    return axiosInstance.get<{
      success: boolean;
      data: ServiceBooking[];
    }>(`/user-services/${serviceId}/bookings`);
  },

  // Get user bookings
  getUserBookings: (userId: number) => {
    return axiosInstance.get<{
      success: boolean;
      data: ServiceBooking[];
    }>(`/user-services/users/${userId}/bookings`);
  },

  // Update booking status
  updateBookingStatus: (bookingId: number, data: UpdateBookingStatusRequest) => {
    return axiosInstance.put<{
      success: boolean;
      data: ServiceBooking;
    }>(`/user-services/bookings/${bookingId}/status`, data);
  },

  // Create review
  createReview: (data: CreateReviewRequest) => {
    return axiosInstance.post<{
      success: boolean;
      data: ServiceReview;
    }>('/user-services/reviews', data);
  },

  // Get service reviews
  getServiceReviews: (serviceId: number) => {
    return axiosInstance.get<{
      success: boolean;
      data: ServiceReview[];
    }>(`/user-services/${serviceId}/reviews`);
  },
};
