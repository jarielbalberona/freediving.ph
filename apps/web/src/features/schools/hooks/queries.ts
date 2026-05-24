import { queryKeys } from "@/lib/query/query-keys";
import type {
  CourseBookingFilters,
  CourseSessionFilters,
  PublicCourseFilters,
  PublicSchoolFilters,
} from "@freediving.ph/types";
import { useQuery } from "@tanstack/react-query";
import { schoolsApi } from "../api/schools";

export const useManageSchools = () =>
  useQuery({
    queryKey: queryKeys.schools.list(),
    queryFn: schoolsApi.listSchools,
  });

export const usePublicSchools = (filters: PublicSchoolFilters = {}) =>
  useQuery({
    queryKey: queryKeys.schools.publicList(filters as Record<string, unknown>),
    queryFn: () => schoolsApi.listPublicSchools(filters),
  });

export const usePublicSchool = (slug: string) =>
  useQuery({
    queryKey: queryKeys.schools.publicDetail(slug),
    queryFn: () => schoolsApi.getPublicSchool(slug),
    enabled: Boolean(slug),
  });

export const usePublicCourses = (
  slug: string,
  filters: PublicCourseFilters = {},
) =>
  useQuery({
    queryKey: queryKeys.schools.publicCourses(
      slug,
      filters as Record<string, unknown>,
    ),
    queryFn: () => schoolsApi.listPublicCourses(slug, filters),
    enabled: Boolean(slug),
  });

export const usePublicCourse = (slug: string, courseSlug: string) =>
  useQuery({
    queryKey: queryKeys.schools.publicCourse(slug, courseSlug),
    queryFn: () => schoolsApi.getPublicCourse(slug, courseSlug),
    enabled: Boolean(slug && courseSlug),
  });

export const usePublicCourseSessions = (slug: string, courseSlug: string) =>
  useQuery({
    queryKey: queryKeys.schools.publicCourseSessions(slug, courseSlug),
    queryFn: () => schoolsApi.listPublicCourseSessions(slug, courseSlug),
    enabled: Boolean(slug && courseSlug),
  });

export const useMyCourseBookings = () =>
  useQuery({
    queryKey: queryKeys.schools.myBookings(),
    queryFn: schoolsApi.listMyBookings,
  });

export const useManageSchool = (slug: string) =>
  useQuery({
    queryKey: queryKeys.schools.detail(slug),
    queryFn: () => schoolsApi.getSchool(slug),
    enabled: Boolean(slug),
  });

export const useManageCourses = (slug: string) =>
  useQuery({
    queryKey: queryKeys.schools.courses(slug),
    queryFn: () => schoolsApi.listCourses(slug),
    enabled: Boolean(slug),
  });

export const useManagePaymentMethods = (slug: string) =>
  useQuery({
    queryKey: queryKeys.schools.paymentMethods(slug),
    queryFn: () => schoolsApi.listPaymentMethods(slug),
    enabled: Boolean(slug),
  });

export const useManageSessions = (
  slug: string,
  filters: CourseSessionFilters = {},
) =>
  useQuery({
    queryKey: queryKeys.schools.sessions(
      slug,
      filters as Record<string, unknown>,
    ),
    queryFn: () => schoolsApi.listSessions(slug, filters),
    enabled: Boolean(slug),
  });

export const useManageBookings = (
  slug: string,
  filters: CourseBookingFilters = {},
) =>
  useQuery({
    queryKey: queryKeys.schools.bookings(
      slug,
      filters as Record<string, unknown>,
    ),
    queryFn: () => schoolsApi.listBookings(slug, filters),
    enabled: Boolean(slug),
  });
