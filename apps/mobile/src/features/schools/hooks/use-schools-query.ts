import { useQuery } from "@tanstack/react-query";
import type { PublicCourseFilters, PublicSchoolFilters } from "@freediving.ph/types";

import {
  getPublicCourse,
  listMyCourseBookings,
  listPublicCourseSessions,
  listPublicCourses,
  listPublicSchools,
} from "@/features/schools/api/schools-api";
import { mobileQueryKeys, useAuthenticatedFphgoQuery } from "@/lib/query";

export const usePublicSchoolsQuery = (filters: PublicSchoolFilters = {}) =>
  useQuery({
    queryFn: async () => {
      const response = await listPublicSchools(filters);
      return response.schools ?? [];
    },
    queryKey: mobileQueryKeys.schools.list(filters),
    staleTime: 2 * 60 * 1000,
  });

export const usePublicSchoolQuery = (slug: string | undefined) =>
  useQuery({
    enabled: Boolean(slug),
    queryFn: async () => {
      const response = await listPublicSchools();
      return response.schools.find((school) => school.slug === slug) ?? null;
    },
    queryKey: mobileQueryKeys.schools.detail(slug ?? ""),
    staleTime: 2 * 60 * 1000,
  });

export const usePublicCoursesQuery = (
  slug: string | undefined,
  filters: PublicCourseFilters = {},
) =>
  useQuery({
    enabled: Boolean(slug),
    queryFn: () => listPublicCourses(slug ?? "", filters),
    queryKey: mobileQueryKeys.schools.courses(slug ?? "", filters),
    staleTime: 2 * 60 * 1000,
  });

export const usePublicCourseQuery = (
  slug: string | undefined,
  courseSlug: string | undefined,
) =>
  useQuery({
    enabled: Boolean(slug) && Boolean(courseSlug),
    queryFn: () => getPublicCourse(slug ?? "", courseSlug ?? ""),
    queryKey: mobileQueryKeys.schools.course(slug ?? "", courseSlug ?? ""),
    staleTime: 2 * 60 * 1000,
  });

export const usePublicCourseSessionsQuery = (
  slug: string | undefined,
  courseSlug: string | undefined,
) =>
  useQuery({
    enabled: Boolean(slug) && Boolean(courseSlug),
    queryFn: async () => {
      const response = await listPublicCourseSessions(slug ?? "", courseSlug ?? "");
      return response.sessions ?? [];
    },
    queryKey: mobileQueryKeys.schools.sessions(slug ?? "", courseSlug ?? ""),
    staleTime: 60 * 1000,
  });

export const useMyCourseBookingsQuery = (enabled = true) =>
  useAuthenticatedFphgoQuery({
    enabled,
    queryFn: async (_context, authToken) => {
      const response = await listMyCourseBookings(authToken);
      return response.bookings ?? [];
    },
    queryKey: mobileQueryKeys.schools.myBookings(),
    staleTime: 60 * 1000,
  });
