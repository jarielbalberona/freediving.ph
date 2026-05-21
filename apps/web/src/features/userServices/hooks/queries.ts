import { useQuery } from "@tanstack/react-query";
import { userServicesApi } from "../api/userServices";
import type { ServiceFilters } from "@freediving.ph/types";
import { queryKeys } from "@/lib/query/query-keys";

export const useServices = (filters?: ServiceFilters) => {
  return useQuery({
    queryKey: queryKeys.services.list(
      filters as Record<string, unknown> | undefined,
    ),
    queryFn: () => userServicesApi.getServices(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useService = (serviceId: number) => {
  return useQuery({
    queryKey: queryKeys.services.detail(serviceId),
    queryFn: () => userServicesApi.getServiceById(serviceId),
    enabled: !!serviceId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useUserServices = (userId: number) => {
  return useQuery({
    queryKey: queryKeys.services.userServices(userId),
    queryFn: () => userServicesApi.getUserServices(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useServiceBookings = (serviceId: number) => {
  return useQuery({
    queryKey: queryKeys.services.serviceBookings(serviceId),
    queryFn: () => userServicesApi.getServiceBookings(serviceId),
    enabled: !!serviceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useUserBookings = (userId: number) => {
  return useQuery({
    queryKey: queryKeys.services.userBookings(userId),
    queryFn: () => userServicesApi.getUserBookings(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useServiceReviews = (serviceId: number) => {
  return useQuery({
    queryKey: queryKeys.services.reviews(serviceId),
    queryFn: () => userServicesApi.getServiceReviews(serviceId),
    enabled: !!serviceId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
