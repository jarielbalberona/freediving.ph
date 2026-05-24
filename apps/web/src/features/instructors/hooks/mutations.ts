import type {
  InstructorAdminReviewPayload,
  InstructorApplicationPayload,
  InstructorCertificationPayload,
  InstructorSubmitPayload,
} from "@freediving.ph/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trackProductEvent } from "@/lib/analytics/product-events";

import { instructorsApi } from "../api/instructors";
import { instructorQueryKeys } from "./queries";

export function useSaveInstructorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InstructorApplicationPayload) =>
      instructorsApi.saveMe(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: instructorQueryKeys.me() }),
  });
}

export function useSubmitInstructorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InstructorSubmitPayload) =>
      instructorsApi.submitMe(data),
    onSuccess: () => {
      trackProductEvent("instructor_application_submitted");
      queryClient.invalidateQueries({ queryKey: instructorQueryKeys.me() });
    },
  });
}

export function useCreateInstructorCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InstructorCertificationPayload) =>
      instructorsApi.createCertification(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: instructorQueryKeys.me() }),
  });
}

export function useUpdateInstructorCertification(certificationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InstructorCertificationPayload) =>
      instructorsApi.updateCertification(certificationId, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: instructorQueryKeys.me() }),
  });
}

export function useDeleteInstructorCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (certificationId: string) =>
      instructorsApi.deleteCertification(certificationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: instructorQueryKeys.me() }),
  });
}

export function useVerifyInstructor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (instructorId: string) =>
      instructorsApi.verifyAdminInstructor(instructorId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: instructorQueryKeys.all }),
  });
}

export function useRejectInstructor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      instructorId,
      data,
    }: {
      instructorId: string;
      data: InstructorAdminReviewPayload;
    }) => instructorsApi.rejectAdminInstructor(instructorId, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: instructorQueryKeys.all }),
  });
}

export function useSuspendInstructor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      instructorId,
      data,
    }: {
      instructorId: string;
      data: InstructorAdminReviewPayload;
    }) => instructorsApi.suspendAdminInstructor(instructorId, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: instructorQueryKeys.all }),
  });
}
