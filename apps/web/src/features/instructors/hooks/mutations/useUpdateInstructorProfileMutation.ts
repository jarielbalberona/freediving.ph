import type {
  InstructorApplication,
  InstructorApplicationPayload,
} from "@freediving.ph/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { instructorsApi } from "../../api/instructors";
import { instructorProfileQueryKeys } from "../queries/useMyInstructorProfileQuery";

export function useUpdateInstructorProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation<InstructorApplication, unknown, InstructorApplicationPayload>({
    mutationFn: (data: InstructorApplicationPayload) =>
      instructorsApi.saveMe(data).then((response) => response.application),
    onSuccess: (response: InstructorApplication) => {
      queryClient.setQueryData(instructorProfileQueryKeys.me(), response);
    },
  });
}
