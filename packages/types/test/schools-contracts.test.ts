import assert from "node:assert/strict";
import test from "node:test";
import type {
  CourseBookingStatus,
  CoursePaymentMethodType,
  CourseSessionStatus,
  CourseType,
  CreateStudentCourseBookingRequest,
  PublicCourse,
  PublicSchool,
  StudentCourseBookingPayment,
  SchoolStatus,
} from "../src/index";

test("schools module shared contracts expose backend enum values", () => {
  const schoolStatus: SchoolStatus = "published";
  const courseType: CourseType = "pool_training";
  const sessionStatus: CourseSessionStatus = "scheduled";
  const bookingStatus: CourseBookingStatus = "pending_review";
  const paymentMethodType: CoursePaymentMethodType = "MANUAL_QR";

  assert.equal(schoolStatus, "published");
  assert.equal(courseType, "pool_training");
  assert.equal(sessionStatus, "scheduled");
  assert.equal(bookingStatus, "pending_review");
  assert.equal(paymentMethodType, "MANUAL_QR");
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
    locationLabel: "Pool",
    diveSiteId: "",
    includedMarkdown: "",
    prerequisitesMarkdown: "",
    equipmentMarkdown: "",
    cancellationPolicyMarkdown: "",
    availabilityNote: "",
    upcomingSessionCount: 0,
  };
  const booking: CreateStudentCourseBookingRequest = {
    preferredDate: "2026-06-15",
    studentNote: "Morning preferred",
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
  assert.equal(payment.status, "not_required");
});
