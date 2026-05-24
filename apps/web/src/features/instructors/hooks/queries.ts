import type { AdminListParams } from "@freediving.ph/types";
import { useQuery } from "@tanstack/react-query";

import { instructorsApi } from "../api/instructors";

export const instructorQueryKeys = {
  all: ["instructors"] as const,
  me: () => [...instructorQueryKeys.all, "me"] as const,
  public: (username: string) =>
    [...instructorQueryKeys.all, "public", username] as const,
  adminList: (params: AdminListParams & { status?: string }) =>
    [...instructorQueryKeys.all, "admin", params] as const,
};

export function useMyInstructorApplication() {
  return useQuery({
    queryKey: instructorQueryKeys.me(),
    queryFn: () => instructorsApi.getMe(),
  });
}

export function usePublicInstructor(username: string) {
  return useQuery({
    queryKey: instructorQueryKeys.public(username),
    queryFn: () => instructorsApi.getPublicInstructor(username),
    enabled: Boolean(username),
    retry: false,
  });
}

export function useAdminInstructors(
  params: AdminListParams & { status?: string },
) {
  return useQuery({
    queryKey: instructorQueryKeys.adminList(params),
    queryFn: () => instructorsApi.listAdminInstructors(params),
  });
}
