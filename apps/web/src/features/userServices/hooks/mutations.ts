import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userServicesApi } from "../api/userServices";
import { queryKeys } from "@/lib/query/query-keys";
import type {
  CreateServiceRequest,
  UpdateServiceRequest,
  CreateBookingRequest,
  UpdateBookingStatusRequest,
  CreateReviewRequest,
} from "@freediving.ph/types";

export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceRequest) =>
      userServicesApi.createService(data),
    onSuccess: () => {
      // Invalidate services list
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.lists(),
      });
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      data,
    }: { serviceId: number; data: UpdateServiceRequest }) =>
      userServicesApi.updateService(serviceId, data),
    onSuccess: (response, variables) => {
      // Invalidate specific service
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.detail(variables.serviceId),
      });
      // Invalidate services list
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.lists(),
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
        queryKey: queryKeys.services.serviceBookings(variables.serviceId),
      });
      // Invalidate user bookings
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.userBookings(variables.userId),
      });
    },
  });
};

export const useUpdateBookingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookingId,
      data,
    }: { bookingId: number; data: UpdateBookingStatusRequest }) =>
      userServicesApi.updateBookingStatus(bookingId, data),
    onSuccess: (response, variables) => {
      // Invalidate all booking-related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.bookings(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.bookings(),
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
        queryKey: queryKeys.services.reviews(variables.serviceId),
      });
      // Invalidate specific service to update rating
      queryClient.invalidateQueries({
        queryKey: queryKeys.services.detail(variables.serviceId),
      });
    },
  });
};
