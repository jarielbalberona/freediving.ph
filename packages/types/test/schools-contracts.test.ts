import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultPaymentInstructions,
  validatePaymentMethodDetails,
} from "../src/index";
import type {
  CourseBookingStatus,
  CourseBookingMode,
  CourseLocationMode,
  CoursePaymentMethodType,
  CourseSessionStatus,
  CourseType,
  CreateCourseRequest,
  CreateCourseSessionRequest,
  CreateStudentCourseBookingRequest,
  PublicCourse,
  PublicCourseSession,
  PublicSchool,
  StudentCourseBookingPayment,
  SchoolStatus,
} from "../src/index";

test("schools module shared contracts expose backend enum values", () => {
  const schoolStatus: SchoolStatus = "published";
  const courseType: CourseType = "pool_training";
  const courseLocationMode: CourseLocationMode = "inherit_school";
  const sessionStatus: CourseSessionStatus = "scheduled";
  const bookingStatus: CourseBookingStatus = "pending_review";
  const bookingMode: CourseBookingMode = "session";
  const paymentMethodType: CoursePaymentMethodType = "manual_qr";

  assert.equal(schoolStatus, "published");
  assert.equal(courseType, "pool_training");
  assert.equal(courseLocationMode, "inherit_school");
  assert.equal(sessionStatus, "scheduled");
  assert.equal(bookingStatus, "pending_review");
  assert.equal(bookingMode, "session");
  assert.equal(paymentMethodType, "manual_qr");
});

test("shared payment method validation enforces active method requirements", () => {
  assert.equal(defaultPaymentInstructions.includes("receipt"), true);
  assert.deepEqual(
    validatePaymentMethodDetails({
      type: "manual_qr",
      qrImageUrl: "https://example.test/legacy-qr.png",
      isActive: true,
    }).map((issue) => issue.path),
    ["qrMediaId"],
  );
  assert.deepEqual(
    validatePaymentMethodDetails({
      type: "manual_qr",
      qrMediaId: "media-1",
      accountNumber: "0917 000 0000",
      isActive: true,
    }),
    [],
  );
  assert.deepEqual(
    validatePaymentMethodDetails({
      type: "bank_transfer",
      bankName: "BPI",
      accountName: "Freediving School",
      accountNumber: "0000",
      isActive: true,
    }),
    [],
  );
  assert.deepEqual(
    validatePaymentMethodDetails({
      type: "bank_transfer",
      isActive: true,
    }).map((issue) => issue.path),
    ["bankName", "accountName", "accountNumber"],
  );
  assert.deepEqual(
    validatePaymentMethodDetails({
      type: "bank_transfer",
      bankName: "   ",
      accountName: "\t",
      accountNumber: "",
      isActive: true,
    }).map((issue) => issue.path),
    ["bankName", "accountName", "accountNumber"],
  );
});

test("school management create contracts do not require currency or timezone", () => {
  const course: CreateCourseRequest = {
    title: "Pool Training",
    shortDescription: "",
    descriptionMarkdown: "",
    courseType: "pool_training",
    level: "",
    durationLabel: "2 hours",
    priceAmount: 1500,
    paymentRequired: true,
    approvalRequired: true,
    allowSessionBooking: true,
    allowPreferredDateRequest: true,
    locationMode: "inherit_school",
    locationLabel: "",
    locationNote: "",
    formattedAddress: "",
    regionCode: "",
    regionName: "",
    provinceCode: "",
    provinceName: "",
    cityCode: "",
    cityName: "",
    barangayCode: "",
    barangayName: "",
    locationSource: "manual",
    diveSiteId: "",
    includedMarkdown: "",
    prerequisitesMarkdown: "",
    equipmentMarkdown: "",
    cancellationPolicyMarkdown: "",
    availabilityNote: "",
    status: "draft",
  };
  const session: CreateCourseSessionRequest = {
    courseId: "course-1",
    title: "Line session",
    startsAt: "2026-06-15T01:00:00Z",
    endsAt: "2026-06-15T03:00:00Z",
    locationMode: "inherit_course",
    locationLabel: "",
    locationNote: "",
    formattedAddress: "",
    regionCode: "",
    regionName: "",
    provinceCode: "",
    provinceName: "",
    cityCode: "",
    cityName: "",
    barangayCode: "",
    barangayName: "",
    locationSource: "manual",
    diveSiteId: "",
    instructorUserId: "",
    capacity: null,
    status: "draft",
    notesMarkdown: "",
  };

  assert.equal(course.paymentRequired, true);
  assert.equal(session.locationMode, "inherit_course");
});

test("schools public and student contracts expose customer-safe shapes", () => {
  const school: PublicSchool = {
    id: "school-1",
    slug: "anima",
    name: "Anima Freediving Academy",
    shortDescription: "Training in the Philippines",
    descriptionMarkdown: "",
    baseLocation: "Dauin",
    baseLocationLabel: "Dauin",
    formattedAddress: "Dauin, Negros Oriental",
    regionCode: "07",
    regionName: "Central Visayas",
    provinceCode: "",
    provinceName: "Negros Oriental",
    cityCode: "",
    cityName: "Dauin",
    barangayCode: "",
    barangayName: "",
    locationSource: "manual",
    diveSiteId: "",
    diveSiteName: "",
    diveSiteSlug: "",
    diveSiteArea: "",
    websiteUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    publishedCourseCount: 2,
  };
  const course: PublicCourse = {
    id: "course-1",
    schoolId: school.id,
    slug: "pool-training",
    title: "Pool Training",
    shortDescription: "",
    descriptionMarkdown: "",
    courseType: "pool_training",
    level: "all_levels",
    durationLabel: "2 hours",
    priceAmount: null,
    currency: "PHP",
    paymentRequired: false,
    approvalRequired: true,
    allowSessionBooking: true,
    allowPreferredDateRequest: true,
    locationMode: "text_only",
    locationLabel: "Pool",
    locationNote: "Meet at reception",
    formattedAddress: "",
    regionCode: "",
    regionName: "",
    provinceCode: "",
    provinceName: "",
    cityCode: "",
    cityName: "",
    barangayCode: "",
    barangayName: "",
    locationSource: "manual",
    diveSiteId: "",
    includedMarkdown: "",
    prerequisitesMarkdown: "",
    equipmentMarkdown: "",
    cancellationPolicyMarkdown: "",
    availabilityNote: "",
    upcomingSessionCount: 0,
  };
  const booking: CreateStudentCourseBookingRequest = {
    bookingMode: "preferred_date",
    preferredDate: "2026-06-15",
    studentNote: "Morning preferred",
  };
  const session: PublicCourseSession = {
    id: "session-1",
    slug: "pool-training-june",
    courseId: course.id,
    title: "June pool training",
    startsAt: "2026-06-15T01:00:00Z",
    endsAt: "2026-06-15T03:00:00Z",
    timezone: "Asia/Manila",
    locationLabel: "Pool",
    formattedAddress: "",
    diveSiteId: "",
    instructorDisplayName: "",
    capacity: 4,
    bookedCount: 1,
    slotsLeft: 3,
    isFull: false,
  };
  const payment: StudentCourseBookingPayment = {
    id: "payment-1",
    bookingId: "booking-1",
    courseId: course.id,
    schoolId: school.id,
    studentUserId: "student-1",
    paymentMethodId: "",
    amount: null,
    currency: "PHP",
    proofMediaId: "",
    referenceNumber: "",
    status: "not_required",
    reviewedAt: null,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  };

  assert.equal(school.slug, "anima");
  assert.equal(course.courseType, "pool_training");
  assert.equal(booking.preferredDate, "2026-06-15");
  assert.equal(session.slotsLeft, 3);
  assert.equal(payment.status, "not_required");
});
