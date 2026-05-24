import type {
  CourseBookingPaymentStatus,
  CourseBookingStatus,
  CourseLevel,
  CourseSessionStatus,
  CourseStatus,
  CourseType,
  SchoolStatus,
} from "@freediving.ph/types";

export const schoolStatusLabels: Record<SchoolStatus, string> = {
  draft: "Draft",
  published: "Published",
  suspended: "Suspended",
};

export const courseTypeLabels: Record<CourseType, string> = {
  intro: "Intro",
  pool_training: "Pool training",
  line_training: "Line training",
  depth_training: "Depth training",
  certification: "Certification",
  coaching: "Coaching",
  workshop: "Workshop",
  trip_course: "Trip course",
  custom: "Custom",
};

export const courseLevelLabels: Record<CourseLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  all_levels: "All levels",
};

export const courseStatusLabels: Record<CourseStatus, string> = {
  draft: "Draft",
  published: "Published",
  paused: "Paused",
  archived: "Archived",
};

export const sessionStatusLabels: Record<CourseSessionStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const bookingStatusLabels: Record<CourseBookingStatus, string> = {
  pending_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  reschedule_requested: "Reschedule requested",
};

export const paymentStatusLabels: Record<CourseBookingPaymentStatus, string> = {
  not_required: "Not required",
  pending_upload: "Pending upload",
  submitted: "Submitted",
  verified: "Verified",
  rejected: "Rejected",
};

export const paymentMethodTypeLabels = {
  MANUAL_QR: "Manual QR",
  MANUAL_BANK_TRANSFER: "Bank transfer",
} as const;
