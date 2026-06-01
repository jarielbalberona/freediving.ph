import { useQuery } from "@tanstack/react-query";

import {
  getMyInstructorApplication,
  getPublicInstructor,
} from "@/features/instructors/api/instructors-api";
import { mobileQueryKeys, useAuthenticatedFphgoQuery } from "@/lib/query";

export const useMyInstructorApplicationQuery = (enabled = true) =>
  useAuthenticatedFphgoQuery({
    enabled,
    queryFn: (_context, authToken) => getMyInstructorApplication(authToken),
    queryKey: mobileQueryKeys.instructors.me(),
    staleTime: 60 * 1000,
  });

export const usePublicInstructorQuery = (
  username: string | undefined,
  enabled = true,
) =>
  useQuery({
    enabled: enabled && Boolean(username),
    queryFn: () => getPublicInstructor(username ?? ""),
    queryKey: mobileQueryKeys.instructors.public(username ?? ""),
    retry: false,
    staleTime: 2 * 60 * 1000,
  });
