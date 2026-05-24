import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("customer schools routes and sidebar are wired separately from manage routes", () => {
  const nav = read("src/config/nav.ts");
  const schoolsPage = read("src/app/schools/page.tsx");
  const schoolPage = read("src/app/schools/[slug]/page.tsx");
  const coursesPage = read("src/app/schools/[slug]/courses/page.tsx");
  const coursePage = read(
    "src/app/schools/[slug]/courses/[courseSlug]/page.tsx",
  );
  const bookPage = read(
    "src/app/schools/[slug]/courses/[courseSlug]/book/page.tsx",
  );
  const myBookingsPage = read("src/app/my/bookings/page.tsx");

  assert.match(nav, /id: "schools"/);
  assert.match(nav, /title: "Schools"/);
  assert.match(nav, /href: "\/schools"/);
  assert.match(schoolsPage, /SchoolsBrowsePage/);
  assert.match(schoolPage, /SchoolProfilePage/);
  assert.match(coursesPage, /SchoolCoursesPage/);
  assert.match(coursePage, /CourseDetailPage/);
  assert.match(bookPage, /CourseBookPage/);
  assert.match(myBookingsPage, /MyBookingsPage/);
});

test("customer schools UI uses friendly labels, tabs, booking prompts, and Base UI Select wrapper", () => {
  const page = read("src/features/schools/pages/PublicSchoolsPage.tsx");
  const paymentSetup = read(
    "src/features/payments/components/PaymentMethodsSetup.tsx",
  );
  const schoolsApi = read("src/features/schools/api/schools.ts");
  const schoolMutations = read("src/features/schools/hooks/mutations.ts");
  const mediaTypes = read("../../packages/types/src/media.ts");
  const constants = read("src/features/schools/constants.ts");

  assert.match(page, /TabsTrigger value="overview"/);
  assert.match(page, /TabsTrigger value="courses"/);
  assert.match(page, /TabsTrigger value="book"/);
  assert.match(page, /Choose from available schedules/);
  assert.match(page, /Request another date/);
  assert.match(page, /Available schedules/);
  assert.match(page, /Book this schedule/);
  assert.match(page, /usePublicCourseSessions/);
  assert.match(page, /bookingMode: "session"/);
  assert.match(page, /Sign in required/);
  assert.match(page, /Preferred date/);
  assert.match(page, /PaymentMethodCustomerDisplay/);
  assert.match(page, /school\.paymentMethods/);
  assert.match(page, /activePaymentMethods/);
  assert.match(page, /paymentMethodItems/);
  assert.match(page, /selectedPaymentMethod/);
  assert.match(page, /Choose a payment method/);
  assert.match(page, /Receipt upload is optional/);
  assert.match(page, /course_booking_receipt/);
  assert.match(page, /Upload receipt/);
  assert.match(page, /useSubmitMyBookingPayment/);
  assert.match(
    page,
    /PaymentMethodCustomerDisplay method=\{selectedPaymentMethod\}/,
  );
  assert.doesNotMatch(
    page,
    /PaymentMethodCustomerDisplay key=\{method\.id\} method=\{method\}/,
  );
  assert.match(paymentSetup, /Account number/);
  assert.match(paymentSetup, /sm:grid-cols-\[11rem_minmax\(0,1fr\)\]/);
  assert.doesNotMatch(paymentSetup, /md:grid-cols-\[auto_minmax\(0,1fr\)\]/);
  assert.match(paymentSetup, /open=\{createOpen\}/);
  assert.match(paymentSetup, /DialogTitle>Add payment method/);
  assert.match(paymentSetup, /onClick=\{\(\) => setCreateOpen\(true\)\}/);
  assert.match(paymentSetup, /onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(paymentSetup, /paymentMethodSummary\(form\)/);
  assert.doesNotMatch(paymentSetup, /<article className="grid gap-3 py-4">/);
  assert.match(paymentSetup, /Payment QR image is not available yet/);
  assert.match(schoolsApi, /submitMyBookingPayment/);
  assert.match(
    schoolsApi,
    /\/v1\/me\/course-bookings\/\$\{encodeURIComponent\(bookingId\)\}\/payment/,
  );
  assert.match(schoolMutations, /useSubmitMyBookingPayment/);
  assert.match(mediaTypes, /course_booking_receipt/);
  assert.doesNotMatch(paymentSetup, />manual_qr</);
  assert.doesNotMatch(paymentSetup, />bank_transfer</);
  assert.match(page, /not ready for online booking/);
  assert.match(page, /formatPeso\(course\.priceAmount\)/);
  assert.match(page, /SelectTrigger/);
  assert.match(page, /SelectValue/);
  assert.match(constants, /Pool training/);
  assert.match(constants, /Pending review/);
  assert.match(constants, /Preferred date request/);
  assert.match(constants, /Not required/);
  assert.doesNotMatch(page, />pending_review</);
  assert.doesNotMatch(page, />pool_training</);
  assert.doesNotMatch(page, /course\.currency/);
  assert.doesNotMatch(page, /currency: course\.currency/);
});

test("admin school form uses LocationPicker and optional dive site selector", () => {
  const page = read("src/features/schools/pages/ManageSchoolsPage.tsx");

  assert.match(page, /LocationPicker/);
  assert.match(page, /DiveSiteCombobox/);
  assert.match(page, /baseLocationLabel/);
  assert.match(page, /diveSiteId/);
});
