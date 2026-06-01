import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreateStudentCourseBookingRequest,
  MyCourseBooking,
  SubmitCourseBookingPaymentRequest,
} from "@freediving.ph/types";

import {
  cancelMyCourseBooking,
  createStudentBooking,
  submitMyCourseBookingPayment,
} from "@/features/schools/api/schools-api";
import { FphgoApiError } from "@/lib/api";
import { mobileQueryKeys } from "@/lib/query";

const useRequiredToken = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return async () => {
    if (!isLoaded) {
      throw new FphgoApiError(401, "Checking your session. Try again in a moment.", null);
    }
    if (!isSignedIn) throw new FphgoApiError(401, "Sign in to continue.", null);
    const token = await getToken();
    if (!token) throw new FphgoApiError(401, "Sign in to continue.", null);
    return token;
  };
};

export const useCreateCourseBookingMutation = (
  slug: string,
  courseSlug: string,
) => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: CreateStudentCourseBookingRequest): Promise<MyCourseBooking> => {
      const response = await createStudentBooking(
        slug,
        courseSlug,
        payload,
        await getRequiredToken(),
      );
      return response.booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.schools.myBookings() });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.schools.sessions(slug, courseSlug) });
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.schools.course(slug, courseSlug) });
    },
  });
};

export const useCancelCourseBookingMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (bookingId: string): Promise<MyCourseBooking> => {
      const response = await cancelMyCourseBooking(bookingId, await getRequiredToken());
      return response.booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.schools.myBookings() });
    },
  });
};

export const useSubmitCourseBookingPaymentMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async ({
      bookingId,
      payload,
    }: {
      bookingId: string;
      payload: SubmitCourseBookingPaymentRequest;
    }): Promise<MyCourseBooking> => {
      const response = await submitMyCourseBookingPayment(
        bookingId,
        payload,
        await getRequiredToken(),
      );
      return response.booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.schools.myBookings() });
    },
  });
};
