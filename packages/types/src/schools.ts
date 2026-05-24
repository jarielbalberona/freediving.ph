export type SchoolStatus = "draft" | "published" | "suspended";
export type SchoolMemberRole = "owner" | "admin" | "instructor";
export type SchoolMemberStatus = "active" | "invited" | "removed";
export type CourseType =
  | "intro"
  | "pool_training"
  | "line_training"
  | "depth_training"
  | "certification"
  | "coaching"
  | "workshop"
  | "trip_course"
  | "custom";
export type CourseLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "all_levels";
export type CourseStatus = "draft" | "published" | "paused" | "archived";
export type CoursePaymentMethodType =
  | "MANUAL_QR"
  | "MANUAL_BANK_TRANSFER";
export type CourseSessionStatus =
  | "draft"
  | "scheduled"
  | "completed"
  | "cancelled";
export type CourseBookingStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "reschedule_requested";
export type CourseBookingPaymentStatus =
  | "not_required"
  | "pending_upload"
  | "submitted"
  | "verified"
  | "rejected";
export type CourseSessionAttendanceStatus =
  | "scheduled"
  | "attended"
  | "no_show"
  | "cancelled";

export interface School {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  descriptionMarkdown: string;
  baseLocation: string;
  baseLocationLabel: string;
  formattedAddress: string;
  regionCode: string;
  regionName: string;
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  barangayCode: string;
  barangayName: string;
  locationSource: string;
  diveSiteId: string;
  diveSiteName: string;
  diveSiteSlug: string;
  diveSiteArea: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  status: SchoolStatus;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
  courseCount: number;
  publishedCourseCount: number;
  pendingBookingCount: number;
  upcomingSessionCount: number;
  paymentsToReviewCount: number;
}

export interface SchoolMember {
  id: string;
  schoolId: string;
  userId: string;
  role: SchoolMemberRole;
  status: SchoolMemberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  schoolId: string;
  slug: string;
  title: string;
  shortDescription: string;
  descriptionMarkdown: string;
  courseType: CourseType;
  level: CourseLevel | "";
  durationLabel: string;
  priceAmount: number | null;
  currency: string;
  paymentRequired: boolean;
  approvalRequired: boolean;
  locationLabel: string;
  diveSiteId: string;
  includedMarkdown: string;
  prerequisitesMarkdown: string;
  equipmentMarkdown: string;
  cancellationPolicyMarkdown: string;
  availabilityNote: string;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
  upcomingSessionCount: number;
  pendingBookingCount: number;
}

export interface CoursePaymentMethod {
  id: string;
  courseId: string;
  type: CoursePaymentMethodType;
  name: string;
  instructions: string;
  qrMediaId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseSession {
  id: string;
  schoolId: string;
  courseId: string;
  courseTitle: string;
  slug: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  locationLabel: string;
  diveSiteId: string;
  instructorUserId: string;
  instructorDisplayName: string;
  capacity: number | null;
  status: CourseSessionStatus;
  notesMarkdown: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
  completedAt?: string | null;
  assignedBookingCount: number;
}

export interface CourseBookingPayment {
  id: string;
  bookingId: string;
  courseId: string;
  schoolId: string;
  studentUserId: string;
  paymentMethodId: string;
  amount: number | null;
  currency: string;
  proofMediaId: string;
  referenceNumber: string;
  status: CourseBookingPaymentStatus;
  reviewedBy: string;
  reviewedAt?: string | null;
  reviewNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentCourseBookingPayment
  extends Omit<CourseBookingPayment, "reviewedBy" | "reviewNotes"> {}

export interface CourseBookingRequest {
  id: string;
  courseId: string;
  courseTitle: string;
  schoolId: string;
  sessionId: string;
  sessionTitle: string;
  studentUserId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  preferredDate: string;
  alternateDate: string;
  status: CourseBookingStatus;
  studentNote: string;
  experienceLevel: string;
  certificationLevel: string;
  equipmentNeeds: string;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  reviewedBy: string;
  scheduledAt?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  payment: CourseBookingPayment | null;
}

export interface PublicSchool {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  descriptionMarkdown: string;
  baseLocation: string;
  baseLocationLabel: string;
  formattedAddress: string;
  regionCode: string;
  regionName: string;
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  barangayCode: string;
  barangayName: string;
  locationSource: string;
  diveSiteId: string;
  diveSiteName: string;
  diveSiteSlug: string;
  diveSiteArea: string;
  websiteUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  publishedCourseCount: number;
}

export interface PublicCourse {
  id: string;
  schoolId: string;
  slug: string;
  title: string;
  shortDescription: string;
  descriptionMarkdown: string;
  courseType: CourseType;
  level: CourseLevel | "";
  durationLabel: string;
  priceAmount: number | null;
  currency: string;
  paymentRequired: boolean;
  approvalRequired: boolean;
  locationLabel: string;
  diveSiteId: string;
  includedMarkdown: string;
  prerequisitesMarkdown: string;
  equipmentMarkdown: string;
  cancellationPolicyMarkdown: string;
  availabilityNote: string;
  upcomingSessionCount: number;
}

export interface MyCourseBooking
  extends Omit<
    CourseBookingRequest,
    "studentUserId" | "reviewedAt" | "reviewedBy" | "adminNotes" | "payment"
  > {
  schoolName?: string;
  payment: StudentCourseBookingPayment | null;
}

export type CourseBookingDetail = MyCourseBooking;

export type CreateSchoolRequest = Pick<
  School,
  | "name"
  | "shortDescription"
  | "descriptionMarkdown"
  | "baseLocation"
  | "baseLocationLabel"
  | "formattedAddress"
  | "regionCode"
  | "regionName"
  | "provinceCode"
  | "provinceName"
  | "cityCode"
  | "cityName"
  | "barangayCode"
  | "barangayName"
  | "locationSource"
  | "diveSiteId"
  | "contactEmail"
  | "contactPhone"
  | "websiteUrl"
  | "facebookUrl"
  | "instagramUrl"
> & { status?: SchoolStatus };

export type UpdateSchoolRequest = Partial<CreateSchoolRequest>;

export type CreateCourseRequest = Omit<
  Course,
  | "id"
  | "schoolId"
  | "slug"
  | "createdAt"
  | "updatedAt"
  | "upcomingSessionCount"
  | "pendingBookingCount"
>;
export type UpdateCourseRequest = CreateCourseRequest;

export type CreateCoursePaymentMethodRequest = Omit<
  CoursePaymentMethod,
  "id" | "courseId" | "createdAt" | "updatedAt"
>;
export type UpdateCoursePaymentMethodRequest =
  CreateCoursePaymentMethodRequest;

export type CreateCourseSessionRequest = Omit<
  CourseSession,
  | "id"
  | "schoolId"
  | "courseTitle"
  | "slug"
  | "instructorDisplayName"
  | "createdAt"
  | "updatedAt"
  | "cancelledAt"
  | "completedAt"
  | "assignedBookingCount"
>;
export type UpdateCourseSessionRequest = CreateCourseSessionRequest;

export type CreateCourseBookingRequest = Omit<
  CourseBookingRequest,
  | "id"
  | "courseTitle"
  | "schoolId"
  | "sessionTitle"
  | "createdAt"
  | "updatedAt"
  | "reviewedAt"
  | "reviewedBy"
  | "scheduledAt"
  | "cancelledAt"
  | "completedAt"
  | "payment"
>;
export type UpdateCourseBookingRequest = CreateCourseBookingRequest;

export interface CreateStudentCourseBookingRequest {
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  preferredDate: string;
  alternateDate?: string;
  studentNote?: string;
  experienceLevel?: string;
  certificationLevel?: string;
  equipmentNeeds?: string;
}

export interface PublicSchoolFilters {
  search?: string;
  location?: string;
  courseType?: CourseType | "";
}

export interface PublicCourseFilters {
  search?: string;
  courseType?: CourseType | "";
  level?: CourseLevel | "";
  payment?: "all" | "free" | "paid" | "";
}

export interface CourseSessionFilters {
  course?: string;
  status?: CourseSessionStatus;
  dateFrom?: string;
  dateTo?: string;
  instructor?: string;
  search?: string;
}

export interface CourseBookingFilters {
  course?: string;
  session?: string;
  status?: CourseBookingStatus;
  paymentStatus?: CourseBookingPaymentStatus;
  preferredDateFrom?: string;
  preferredDateTo?: string;
  search?: string;
}

export interface SchoolSummaryStats {
  totalCourses: number;
  publishedCourses: number;
  pendingBookings: number;
  upcomingSessions: number;
  paymentsToReview: number;
}
