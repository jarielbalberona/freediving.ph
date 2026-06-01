import type {
  Course,
  CourseBookingPayment,
  CourseBookingPaymentProofUrl,
  CourseBookingRequest,
  CourseSession,
  School,
  SchoolMember,
  SchoolPaymentMethod,
} from "@freediving.ph/types";

import { fphgoFetch } from "@/lib/api";

export const listManagedSchools = (authToken: string) =>
  fphgoFetch<{ schools: School[] }>("/v1/management/schools", {
    auth: "required",
    authToken,
  });

export const getManagedSchool = (slug: string, authToken: string) =>
  fphgoFetch<{ school: School }>(
    `/v1/management/schools/${encodeURIComponent(slug)}`,
    { auth: "required", authToken },
  );

export const listManagedCourses = (slug: string, authToken: string) =>
  fphgoFetch<{ courses: Course[] }>(
    `/v1/management/schools/${encodeURIComponent(slug)}/courses`,
    { auth: "required", authToken },
  );

export const listManagedSessions = (slug: string, authToken: string) =>
  fphgoFetch<{ sessions: CourseSession[] }>(
    `/v1/management/schools/${encodeURIComponent(slug)}/sessions`,
    { auth: "required", authToken },
  );

export const setManagedSessionStatus = (
  slug: string,
  sessionId: string,
  action: "cancel" | "complete",
  authToken: string,
) =>
  fphgoFetch<{ session: CourseSession }>(
    `/v1/management/schools/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/${action}`,
    { auth: "required", authToken, body: {}, method: "PATCH" },
  );

export const listManagedBookings = (slug: string, authToken: string) =>
  fphgoFetch<{ bookings: CourseBookingRequest[] }>(
    `/v1/management/schools/${encodeURIComponent(slug)}/bookings`,
    { auth: "required", authToken },
  );

export const setManagedBookingStatus = (
  slug: string,
  bookingId: string,
  action: "approve" | "cancel" | "complete" | "reject",
  authToken: string,
) =>
  fphgoFetch<{ booking: CourseBookingRequest }>(
    `/v1/management/schools/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(bookingId)}/${action}`,
    { auth: "required", authToken, body: {}, method: "PATCH" },
  );

export const reviewManagedBookingPayment = (
  slug: string,
  bookingId: string,
  action: "reject" | "verify",
  reviewNotes: string | undefined,
  authToken: string,
) =>
  fphgoFetch<{ payment: CourseBookingPayment }>(
    `/v1/management/schools/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(bookingId)}/payment/${action}`,
    {
      auth: "required",
      authToken,
      body: { reviewNotes: reviewNotes?.trim() || undefined },
      method: "PATCH",
    },
  );

export const getManagedBookingPaymentProofUrl = (
  slug: string,
  bookingId: string,
  authToken: string,
) =>
  fphgoFetch<CourseBookingPaymentProofUrl>(
    `/v1/management/schools/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(bookingId)}/payment/proof-url`,
    { auth: "required", authToken },
  );

export const listManagedMembers = (slug: string, authToken: string) =>
  fphgoFetch<{ members: SchoolMember[] }>(
    `/v1/management/schools/${encodeURIComponent(slug)}/members`,
    { auth: "required", authToken },
  );

export const listManagedPaymentMethods = (slug: string, authToken: string) =>
  fphgoFetch<{ paymentMethods: SchoolPaymentMethod[] }>(
    `/v1/management/schools/${encodeURIComponent(slug)}/payment-methods`,
    { auth: "required", authToken },
  );
