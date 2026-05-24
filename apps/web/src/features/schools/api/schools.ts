import { axiosInstance } from "@/lib/http/axios";
import type {
  Course,
  CourseBookingFilters,
  CourseBookingPayment,
  CourseBookingRequest,
  CoursePaymentMethod,
  CourseSession,
  CourseSessionFilters,
  CreateCourseBookingRequest,
  CreateCoursePaymentMethodRequest,
  CreateCourseRequest,
  CreateCourseSessionRequest,
  CreateSchoolRequest,
  CreateStudentCourseBookingRequest,
  MyCourseBooking,
  PublicCourse,
  PublicCourseFilters,
  PublicSchool,
  PublicSchoolFilters,
  School,
  UpdateCourseBookingRequest,
  UpdateCoursePaymentMethodRequest,
  UpdateCourseRequest,
  UpdateCourseSessionRequest,
  UpdateSchoolRequest,
} from "@freediving.ph/types";

const paramsFrom = (filters: object = {}) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters as Record<string, unknown>)) {
    if (value !== undefined && value !== null && `${value}`.trim() !== "") {
      params.set(key, `${value}`);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const schoolsApi = {
  listPublicSchools: async (
    filters?: PublicSchoolFilters,
  ): Promise<PublicSchool[]> => {
    const response = await axiosInstance.get<{ schools: PublicSchool[] }>(
      `/v1/schools${paramsFrom(filters ?? {})}`,
    );
    return response.data.schools;
  },
  getPublicSchool: async (slug: string): Promise<PublicSchool> => {
    const response = await axiosInstance.get<{ school: PublicSchool }>(
      `/v1/schools/${encodeURIComponent(slug)}`,
    );
    return response.data.school;
  },
  listPublicCourses: async (
    slug: string,
    filters?: PublicCourseFilters,
  ): Promise<{ school: PublicSchool; courses: PublicCourse[] }> => {
    const response = await axiosInstance.get<{
      school: PublicSchool;
      courses: PublicCourse[];
    }>(`/v1/schools/${encodeURIComponent(slug)}/courses${paramsFrom(filters ?? {})}`);
    return response.data;
  },
  getPublicCourse: async (
    slug: string,
    courseSlug: string,
  ): Promise<{ school: PublicSchool; course: PublicCourse }> => {
    const response = await axiosInstance.get<{
      school: PublicSchool;
      course: PublicCourse;
    }>(
      `/v1/schools/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}`,
    );
    return response.data;
  },
  createStudentBooking: async (
    slug: string,
    courseSlug: string,
    data: CreateStudentCourseBookingRequest,
  ): Promise<MyCourseBooking> => {
    const response = await axiosInstance.post<{ booking: MyCourseBooking }>(
      `/v1/schools/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseSlug)}/bookings`,
      data,
    );
    return response.data.booking;
  },
  listMyBookings: async (): Promise<MyCourseBooking[]> => {
    const response = await axiosInstance.get<{ bookings: MyCourseBooking[] }>(
      "/v1/me/course-bookings",
    );
    return response.data.bookings;
  },
  cancelMyBooking: async (bookingId: string): Promise<MyCourseBooking> => {
    const response = await axiosInstance.patch<{ booking: MyCourseBooking }>(
      `/v1/me/course-bookings/${encodeURIComponent(bookingId)}/cancel`,
      {},
    );
    return response.data.booking;
  },
  listSchools: async (): Promise<School[]> => {
    const response = await axiosInstance.get<{ schools: School[] }>(
      "/v1/manage/schools",
    );
    return response.data.schools;
  },
  createSchool: async (data: CreateSchoolRequest): Promise<School> => {
    const response = await axiosInstance.post<{ school: School }>(
      "/v1/manage/schools",
      data,
    );
    return response.data.school;
  },
  getSchool: async (slug: string): Promise<School> => {
    const response = await axiosInstance.get<{ school: School }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}`,
    );
    return response.data.school;
  },
  updateSchool: async (
    slug: string,
    data: UpdateSchoolRequest,
  ): Promise<School> => {
    const response = await axiosInstance.patch<{ school: School }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}`,
      data,
    );
    return response.data.school;
  },
  listCourses: async (slug: string): Promise<Course[]> => {
    const response = await axiosInstance.get<{ courses: Course[] }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}/courses`,
    );
    return response.data.courses;
  },
  createCourse: async (
    slug: string,
    data: CreateCourseRequest,
  ): Promise<Course> => {
    const response = await axiosInstance.post<{ course: Course }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}/courses`,
      data,
    );
    return response.data.course;
  },
  updateCourse: async (
    slug: string,
    courseId: string,
    data: UpdateCourseRequest,
  ): Promise<Course> => {
    const response = await axiosInstance.patch<{ course: Course }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}/courses/${encodeURIComponent(courseId)}`,
      data,
    );
    return response.data.course;
  },
  listPaymentMethods: async (slug: string): Promise<CoursePaymentMethod[]> => {
    const response = await axiosInstance.get<{
      paymentMethods: CoursePaymentMethod[];
    }>(`/v1/manage/schools/${encodeURIComponent(slug)}/payment-methods`);
    return response.data.paymentMethods;
  },
  createPaymentMethod: async (
    slug: string,
    data: CreateCoursePaymentMethodRequest,
  ): Promise<CoursePaymentMethod> => {
    const response = await axiosInstance.post<{
      paymentMethod: CoursePaymentMethod;
    }>(`/v1/manage/schools/${encodeURIComponent(slug)}/payment-methods`, data);
    return response.data.paymentMethod;
  },
  updatePaymentMethod: async (
    slug: string,
    paymentMethodId: string,
    data: UpdateCoursePaymentMethodRequest,
  ): Promise<CoursePaymentMethod> => {
    const response = await axiosInstance.patch<{
      paymentMethod: CoursePaymentMethod;
    }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}/payment-methods/${encodeURIComponent(paymentMethodId)}`,
      data,
    );
    return response.data.paymentMethod;
  },
  listSessions: async (
    slug: string,
    filters?: CourseSessionFilters,
  ): Promise<CourseSession[]> => {
    const response = await axiosInstance.get<{ sessions: CourseSession[] }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}/sessions${paramsFrom(filters)}`,
    );
    return response.data.sessions;
  },
  createSession: async (
    slug: string,
    data: CreateCourseSessionRequest,
  ): Promise<CourseSession> => {
    const response = await axiosInstance.post<{ session: CourseSession }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}/sessions`,
      data,
    );
    return response.data.session;
  },
  updateSession: async (
    slug: string,
    sessionId: string,
    data: UpdateCourseSessionRequest,
  ): Promise<CourseSession> => {
    const response = await axiosInstance.patch<{ session: CourseSession }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}`,
      data,
    );
    return response.data.session;
  },
  setSessionStatus: async (
    slug: string,
    sessionId: string,
    status: "complete" | "cancel",
  ): Promise<CourseSession> => {
    const response = await axiosInstance.patch<{ session: CourseSession }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}/sessions/${encodeURIComponent(sessionId)}/${status}`,
      {},
    );
    return response.data.session;
  },
  listBookings: async (
    slug: string,
    filters?: CourseBookingFilters,
  ): Promise<CourseBookingRequest[]> => {
    const response = await axiosInstance.get<{
      bookings: CourseBookingRequest[];
    }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}/bookings${paramsFrom(filters)}`,
    );
    return response.data.bookings;
  },
  createBooking: async (
    slug: string,
    data: CreateCourseBookingRequest,
  ): Promise<CourseBookingRequest> => {
    const response = await axiosInstance.post<{
      booking: CourseBookingRequest;
    }>(`/v1/manage/schools/${encodeURIComponent(slug)}/bookings`, data);
    return response.data.booking;
  },
  updateBooking: async (
    slug: string,
    bookingId: string,
    data: UpdateCourseBookingRequest,
  ): Promise<CourseBookingRequest> => {
    const response = await axiosInstance.patch<{
      booking: CourseBookingRequest;
    }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(bookingId)}`,
      data,
    );
    return response.data.booking;
  },
  setBookingStatus: async (
    slug: string,
    bookingId: string,
    action: "approve" | "reject" | "schedule" | "complete" | "cancel",
  ): Promise<CourseBookingRequest> => {
    const response = await axiosInstance.patch<{
      booking: CourseBookingRequest;
    }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(bookingId)}/${action}`,
      {},
    );
    return response.data.booking;
  },
  assignBookingSession: async (
    slug: string,
    bookingId: string,
    sessionId: string,
  ): Promise<CourseBookingRequest> => {
    const response = await axiosInstance.patch<{
      booking: CourseBookingRequest;
    }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(bookingId)}/assign-session`,
      { sessionId },
    );
    return response.data.booking;
  },
  unassignBookingSession: async (
    slug: string,
    bookingId: string,
  ): Promise<CourseBookingRequest> => {
    const response = await axiosInstance.patch<{
      booking: CourseBookingRequest;
    }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(bookingId)}/unassign-session`,
      {},
    );
    return response.data.booking;
  },
  reviewPayment: async (
    slug: string,
    bookingId: string,
    action: "verify" | "reject",
    reviewNotes = "",
  ): Promise<CourseBookingPayment> => {
    const response = await axiosInstance.patch<{
      payment: CourseBookingPayment;
    }>(
      `/v1/manage/schools/${encodeURIComponent(slug)}/bookings/${encodeURIComponent(bookingId)}/payment/${action}`,
      { reviewNotes },
    );
    return response.data.payment;
  },
};
