import type { InstructorApplication } from "@freediving.ph/types";
import { useQuery } from "@tanstack/react-query";

import { instructorsApi } from "../../api/instructors";

export const instructorProfileQueryKeys = {
  me: () => ["instructors", "me"] as const,
};

export function useMyInstructorProfileQuery() {
  return useQuery<
    InstructorApplication,
    Error,
    InstructorApplication,
    ReturnType<(typeof instructorProfileQueryKeys)["me"]>
  >({
    queryKey: instructorProfileQueryKeys.me(),
    queryFn: () => instructorsApi.getMe().then((response) => response.application),
  });
}
