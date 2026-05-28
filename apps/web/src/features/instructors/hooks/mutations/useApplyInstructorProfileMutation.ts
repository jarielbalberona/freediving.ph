import type { InstructorSubmitPayload, InstructorApplication } from "@freediving.ph/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { instructorsApi } from "../../api/instructors";
import { instructorProfileQueryKeys } from "../queries/useMyInstructorProfileQuery";

export function useApplyInstructorProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation<InstructorApplication, unknown, InstructorSubmitPayload>({
    mutationFn: (data: InstructorSubmitPayload) =>
      instructorsApi.submitMe(data).then((response) => response.application),
    onSuccess: (response: InstructorApplication) => {
      queryClient.setQueryData(instructorProfileQueryKeys.me(), response);
    },
  });
}
