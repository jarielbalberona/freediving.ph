import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("mobile schools use public and student booking contracts only", () => {
  const api = read("src/features/schools/api/schools-api.ts");

  for (const endpoint of [
    "/v1/schools",
    "/v1/me/course-bookings",
    "/bookings",
    "/payment",
    "/cancel",
  ]) {
    assert.match(api, new RegExp(endpoint.replaceAll("/", "\\/")));
  }

  assert.doesNotMatch(api, /\/v1\/management\/schools/);
  assert.doesNotMatch(api, /VerifyBookingPayment|RejectBookingPayment|payment\/verify|payment\/reject/);
  assert.match(api, /CreateStudentCourseBookingRequest/);
  assert.match(api, /SubmitCourseBookingPaymentRequest/);
  assert.match(api, /PublicSchoolFilters/);
  assert.match(api, /PublicCourseFilters/);
});

test("mobile schools expose list, detail, course, and my bookings routes", () => {
  assert.match(read("app/(app)/(tabs)/(home)/schools.tsx"), /SchoolsScreen/);
  assert.match(
    read("app/(app)/(tabs)/(home)/schools/[slug].tsx"),
    /SchoolDetailScreen/,
  );
  assert.match(
    read("app/(app)/(tabs)/(home)/schools/[slug]/courses/[courseSlug].tsx"),
    /CourseDetailScreen/,
  );
  assert.match(
    read("app/(app)/(tabs)/(home)/schools/bookings/index.tsx"),
    /MyCourseBookingsScreen/,
  );
  assert.match(read("app/(app)/(tabs)/(home)/_layout.tsx"), /schools\/\[slug\]/);
  assert.match(
    read("app/(app)/(tabs)/(home)/_layout.tsx"),
    /schools\/\[slug\]\/courses\/\[courseSlug\]/,
  );
});

test("course booking screen supports payment proof without management actions", () => {
  const courseScreen = read("src/features/schools/screens/course-detail-screen.tsx");
  const bookingsScreen = read("src/features/schools/screens/my-course-bookings-screen.tsx");

  assert.match(courseScreen, /course_booking_receipt/);
  assert.match(courseScreen, /uploadMediaFiles/);
  assert.match(courseScreen, /allowSessionBooking/);
  assert.match(courseScreen, /allowPreferredDateRequest/);
  assert.match(bookingsScreen, /useCancelCourseBookingMutation/);
  assert.match(bookingsScreen, /useSubmitCourseBookingPaymentMutation/);
  assert.doesNotMatch(`${courseScreen}\n${bookingsScreen}`, /management\/schools/);
  assert.doesNotMatch(`${courseScreen}\n${bookingsScreen}`, /payment\/verify|payment\/reject|VerifyBookingPayment|RejectBookingPayment/);
});
