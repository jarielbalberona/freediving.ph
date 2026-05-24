import { queryKeys } from "@/lib/query/query-keys";
import type {
  CreateCourseBookingRequest,
  CreateCoursePaymentMethodRequest,
  CreateCourseRequest,
  CreateCourseSessionRequest,
  CreateSchoolRequest,
  CreateStudentCourseBookingRequest,
  UpdateCoursePaymentMethodRequest,
  UpdateCourseRequest,
  UpdateCourseSessionRequest,
  UpdateSchoolRequest,
} from "@freediving.ph/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolsApi } from "../api/schools";

export const useCreateSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSchoolRequest) => schoolsApi.createSchool(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.schools.lists() }),
  });
};

export const useUpdateSchool = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSchoolRequest) =>
      schoolsApi.updateSchool(slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schools.all });
    },
  });
};

export const useCreateCourse = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCourseRequest) =>
      schoolsApi.createCourse(slug, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.schools.detail(slug),
      }),
  });
};

export const useUpdateCourse = (slug: string, courseId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCourseRequest) =>
      schoolsApi.updateCourse(slug, courseId, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.schools.detail(slug),
      }),
  });
};

export const useCreatePaymentMethod = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCoursePaymentMethodRequest) =>
      schoolsApi.createPaymentMethod(slug, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.schools.paymentMethods(slug),
      }),
  });
};

export const useUpdatePaymentMethod = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentMethodId,
      data,
    }: {
      paymentMethodId: string;
      data: UpdateCoursePaymentMethodRequest;
    }) => schoolsApi.updatePaymentMethod(slug, paymentMethodId, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.schools.paymentMethods(slug),
      }),
  });
};

export const useCreateSession = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCourseSessionRequest) =>
      schoolsApi.createSession(slug, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.schools.detail(slug),
      }),
  });
};

export const useUpdateSession = (slug: string, sessionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCourseSessionRequest) =>
      schoolsApi.updateSession(slug, sessionId, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.schools.detail(slug),
      }),
  });
};

export const useSetSessionStatus = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      action,
    }: {
      sessionId: string;
      action: "complete" | "cancel";
    }) => schoolsApi.setSessionStatus(slug, sessionId, action),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.schools.detail(slug),
      }),
  });
};

export const useCreateBooking = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCourseBookingRequest) =>
      schoolsApi.createBooking(slug, data),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.schools.detail(slug),
      }),
  });
};

export const useSetBookingStatus = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      action,
    }: {
      bookingId: string;
      action: "approve" | "reject" | "schedule" | "complete" | "cancel";
    }) => schoolsApi.setBookingStatus(slug, bookingId, action),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.schools.detail(slug),
      }),
  });
};

export const useAssignBookingSession = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      sessionId,
    }: {
      bookingId: string;
      sessionId: string;
    }) => schoolsApi.assignBookingSession(slug, bookingId, sessionId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.schools.detail(slug),
      }),
  });
};

export const useReviewBookingPayment = (slug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      action,
    }: {
      bookingId: string;
      action: "verify" | "reject";
    }) => schoolsApi.reviewPayment(slug, bookingId, action),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.schools.detail(slug),
      }),
  });
};

export const useCreateStudentBooking = (slug: string, courseSlug: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStudentCourseBookingRequest) =>
      schoolsApi.createStudentBooking(slug, courseSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.schools.myBookings(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.schools.publicCourse(slug, courseSlug),
      });
    },
  });
};

export const useCancelMyBooking = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => schoolsApi.cancelMyBooking(bookingId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.schools.myBookings(),
      }),
  });
};
