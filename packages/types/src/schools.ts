import type {
  PaymentMethodDetails,
  PaymentMethodType,
} from "./payment-methods";

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
export type CourseLocationMode = "inherit_school" | "structured" | "text_only";
export type SessionLocationMode =
  | "inherit_course"
  | "inherit_school"
  | "structured"
  | "text_only";
export type SchoolPaymentMethodType = PaymentMethodType;
export type CoursePaymentMethodType = SchoolPaymentMethodType;
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
export type CourseBookingMode = "session" | "preferred_date";

export interface StructuredLocationFields {
  locationLabel: string;
  locationNote: string;
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
}

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
  currentUserRole: SchoolMemberRole | "";
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
  allowSessionBooking: boolean;
  allowPreferredDateRequest: boolean;
  locationMode: CourseLocationMode;
  locationLabel: string;
  locationNote: string;
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

export interface SchoolPaymentMethod {
  id: string;
  schoolId: string;
  type: CoursePaymentMethodType;
  name: string;
  instructions: string;
  qrMediaId: string;
  qrImageUrl: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CoursePaymentMethod = SchoolPaymentMethod & {
  courseId?: string;
};

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
  locationMode: SessionLocationMode;
  locationLabel: string;
  locationNote: string;
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

export interface CourseBookingPaymentProofUrl {
  url: string;
  expiresAt: number;
  paymentId: string;
  bookingId: string;
  proofMediaId: string;
  proofFileName?: string;
  proofContentType?: string;
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
  bookingMode: CourseBookingMode;
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
  paymentMethods?: SchoolPaymentMethod[];
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
  allowSessionBooking: boolean;
  allowPreferredDateRequest: boolean;
  locationMode: CourseLocationMode;
  locationLabel: string;
  locationNote: string;
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
  includedMarkdown: string;
  prerequisitesMarkdown: string;
  equipmentMarkdown: string;
  cancellationPolicyMarkdown: string;
  availabilityNote: string;
  upcomingSessionCount: number;
}

export interface PublicCourseSession {
  id: string;
  slug: string;
  courseId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  locationLabel: string;
  formattedAddress: string;
  diveSiteId: string;
  instructorDisplayName: string;
  capacity: number | null;
  bookedCount: number;
  slotsLeft: number | null;
  isFull: boolean;
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
  | "currency"
  | "createdAt"
  | "updatedAt"
  | "upcomingSessionCount"
  | "pendingBookingCount"
> & { currency?: string };
export type UpdateCourseRequest = CreateCourseRequest;

export type CreateCoursePaymentMethodRequest = Omit<
  PaymentMethodDetails,
  "qrImageUrl"
> & {
  type: CoursePaymentMethodType;
  isActive: boolean;
};
export type UpdateCoursePaymentMethodRequest = CreateCoursePaymentMethodRequest;
export type CreateSchoolPaymentMethodRequest = CreateCoursePaymentMethodRequest;
export type UpdateSchoolPaymentMethodRequest = CreateSchoolPaymentMethodRequest;

export type CreateCourseSessionRequest = Omit<
  CourseSession,
  | "id"
  | "schoolId"
  | "courseTitle"
  | "slug"
  | "timezone"
  | "instructorDisplayName"
  | "createdAt"
  | "updatedAt"
  | "cancelledAt"
  | "completedAt"
  | "assignedBookingCount"
> & { timezone?: string };
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
  bookingMode: CourseBookingMode;
  sessionId?: string;
  studentName?: string;
  studentEmail?: string;
  studentPhone?: string;
  preferredDate?: string;
  alternateDate?: string;
  studentNote?: string;
  experienceLevel?: string;
  certificationLevel?: string;
  equipmentNeeds?: string;
}

export interface SubmitCourseBookingPaymentRequest {
  paymentMethodId?: string;
  proofMediaId: string;
  referenceNumber?: string;
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
  sessionId?: string;
  bookingMode?: CourseBookingMode | "";
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
