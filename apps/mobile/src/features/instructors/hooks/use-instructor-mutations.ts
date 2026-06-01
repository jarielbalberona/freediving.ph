import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  InstructorApplicationPayload,
  InstructorCertificationPayload,
  InstructorSubmitPayload,
} from "@freediving.ph/types";

import {
  createInstructorCertification,
  deleteInstructorCertification,
  saveMyInstructorProfile,
  submitMyInstructorProfile,
  updateInstructorCertification,
} from "@/features/instructors/api/instructors-api";
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

export const useSaveInstructorProfileMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: InstructorApplicationPayload) =>
      saveMyInstructorProfile(payload, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.instructors.me() });
    },
  });
};

export const useSubmitInstructorProfileMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (payload: InstructorSubmitPayload) =>
      submitMyInstructorProfile(payload, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.instructors.me() });
    },
  });
};

export const useInstructorCertificationMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async ({
      certificationId,
      payload,
    }: {
      certificationId?: string;
      payload: InstructorCertificationPayload;
    }) =>
      certificationId
        ? updateInstructorCertification(
            certificationId,
            payload,
            await getRequiredToken(),
          )
        : createInstructorCertification(payload, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.instructors.me() });
    },
  });
};

export const useDeleteInstructorCertificationMutation = () => {
  const queryClient = useQueryClient();
  const getRequiredToken = useRequiredToken();

  return useMutation({
    mutationFn: async (certificationId: string) =>
      deleteInstructorCertification(certificationId, await getRequiredToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mobileQueryKeys.instructors.me() });
    },
  });
};
