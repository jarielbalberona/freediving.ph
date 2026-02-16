import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userServicesApi } from '../api/userServices';
import type {
  CreateServiceRequest,
  UpdateServiceRequest,
  CreateBookingRequest,
  UpdateBookingStatusRequest,
  CreateReviewRequest
} from '../types';

export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceRequest) =>
      userServicesApi.createService(data),
    onSuccess: () => {
      // Invalidate services list
      queryClient.invalidateQueries({
        queryKey: ['services']
      });
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceId, data }: { serviceId: number; data: UpdateServiceRequest }) =>
      userServicesApi.updateService(serviceId, data),
    onSuccess: (response, variables) => {
      // Invalidate specific service
      queryClient.invalidateQueries({
        queryKey: ['service', variables.serviceId]
      });
      // Invalidate services list
      queryClient.invalidateQueries({
        queryKey: ['services']
      });
    },
  });
};

export const useCreateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBookingRequest) =>
      userServicesApi.createBooking(data),
    onSuccess: (response, variables) => {
      // Invalidate service bookings
      queryClient.invalidateQueries({
        queryKey: ['service-bookings', variables.serviceId]
      });
      // Invalidate user bookings
      queryClient.invalidateQueries({
        queryKey: ['user-bookings', variables.userId]
      });
    },
  });
};

export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: number; data: UpdateBookingStatusRequest }) =>
      userServicesApi.updateBookingStatus(bookingId, data),
    onSuccess: (response, variables) => {
      // Invalidate all booking-related queries
      queryClient.invalidateQueries({
        queryKey: ['service-bookings']
      });
      queryClient.invalidateQueries({
        queryKey: ['user-bookings']
      });
    },
  });
};

export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReviewRequest) =>
      userServicesApi.createReview(data),
    onSuccess: (response, variables) => {
      // Invalidate service reviews
      queryClient.invalidateQueries({
        queryKey: ['service-reviews', variables.serviceId]
      });
      // Invalidate specific service to update rating
      queryClient.invalidateQueries({
        queryKey: ['service', variables.serviceId]
      });
    },
  });
};
