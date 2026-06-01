import type {
  CreateStudentCourseBookingRequest,
  MyCourseBooking,
  PublicCourse,
  PublicCourseFilters,
  PublicCourseSession,
  PublicSchool,
  PublicSchoolFilters,
  SubmitCourseBookingPaymentRequest,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

const withQuery = (
  path: string,
  params: Record<string, string | number | boolean | undefined>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export const listPublicSchools = (filters: PublicSchoolFilters = {}) =>
  fphgoFetch<{ schools: PublicSchool[] }>(
    withQuery("/v1/schools", {
      courseType: filters.courseType,
      location: filters.location,
      search: filters.search,
    }),
    { auth: "none" },
  );

export const getPublicSchool = (slug: string) =>
  fphgoFetch<{ school: PublicSchool }>(
    `/v1/schools/${encodeURIComponent(slug)}`,
    { auth: "none" },
  );

export const listPublicCourses = (
  slug: string,
  filters: PublicCourseFilters = {},
) =>
  fphgoFetch<{ courses: PublicCourse[]; school: PublicSchool }>(
    withQuery(`/v1/schools/${encodeURIComponent(slug)}/courses`, {
      courseType: filters.courseType,
      level: filters.level,
      payment: filters.payment,
      search: filters.search,
    }),
    { auth: "none" },
  );

export const getPublicCourse = (slug: string, courseSlug: string) =>
  fphgoFetch<{ course: PublicCourse; school: PublicSchool }>(
    `/v1/schools/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}`,
    { auth: "none" },
  );

export const listPublicCourseSessions = (slug: string, courseSlug: string) =>
  fphgoFetch<{
    course: PublicCourse;
    school: PublicSchool;
    sessions: PublicCourseSession[];
  }>(
    `/v1/schools/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/sessions`,
    { auth: "none" },
  );

export const createStudentBooking = (
  slug: string,
  courseSlug: string,
  payload: CreateStudentCourseBookingRequest,
  authToken: string,
) =>
  fphgoFetch<{ booking: MyCourseBooking }>(
    `/v1/schools/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/bookings`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "POST",
    },
  );

export const listMyCourseBookings = (authToken: string) =>
  fphgoFetch<{ bookings: MyCourseBooking[] }>("/v1/me/course-bookings", {
    auth: "required",
    authToken,
  });

export const getMyCourseBooking = (bookingId: string, authToken: string) =>
  fphgoFetch<{ booking: MyCourseBooking }>(
    `/v1/me/course-bookings/${encodeURIComponent(bookingId)}`,
    { auth: "required", authToken },
  );

export const cancelMyCourseBooking = (bookingId: string, authToken: string) =>
  fphgoFetch<{ booking: MyCourseBooking }>(
    `/v1/me/course-bookings/${encodeURIComponent(bookingId)}/cancel`,
    { auth: "required", authToken, body: {}, method: "PATCH" },
  );

export const submitMyCourseBookingPayment = (
  bookingId: string,
  payload: SubmitCourseBookingPaymentRequest,
  authToken: string,
) =>
  fphgoFetch<{ booking: MyCourseBooking }>(
    `/v1/me/course-bookings/${encodeURIComponent(bookingId)}/payment`,
    {
      auth: "required",
      authToken,
      body: payload,
      method: "PATCH",
    },
  );
