import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("manage schools routes and sidebar use /manage", () => {
  const nav = read("src/config/nav.ts");
  const listPage = read("src/app/manage/schools/page.tsx");
  const overviewPage = read("src/app/manage/schools/[slug]/page.tsx");
  const coursesPage = read("src/app/manage/schools/[slug]/courses/page.tsx");
  const bookingsPage = read("src/app/manage/schools/[slug]/bookings/page.tsx");
  const sessionsPage = read("src/app/manage/schools/[slug]/sessions/page.tsx");
  const settingsPage = read("src/app/manage/schools/[slug]/settings/page.tsx");

  assert.match(nav, /manage-schools/);
  assert.match(nav, /Manage Schools/);
  assert.match(nav, /href: "\/manage\/schools"/);
  assert.match(listPage, /ManageSchoolsPage/);
  assert.match(overviewPage, /ManageSchoolOverviewPage/);
  assert.match(coursesPage, /ManageCoursesPage/);
  assert.match(bookingsPage, /ManageBookingsPage/);
  assert.match(sessionsPage, /ManageSessionsPage/);
  assert.match(settingsPage, /ManageSchoolSettingsPage/);
  assert.doesNotMatch(nav + listPage + overviewPage, /manange/);
});

test("schools management UI uses friendly labels and Base UI Select wrapper", () => {
  const page = read("src/features/schools/pages/ManageSchoolsPage.tsx");
  const constants = read("src/features/schools/constants.ts");
  const overviewSection = page.slice(
    page.indexOf("export function ManageSchoolOverviewPage"),
    page.indexOf("export function ManageSchoolSettingsPage"),
  );
  const bookingRow = page.slice(
    page.indexOf("function BookingRow"),
    page.indexOf("function SelectField"),
  );

  assert.match(page, /SelectField/);
  assert.match(page, /SelectTrigger/);
  assert.match(page, /SelectValue/);
  assert.match(page, /TabsList/);
  assert.match(page, /TabsTrigger value="overview"/);
  assert.match(page, /TabsTrigger value="settings"/);
  assert.match(page, /router\.push\(`\$\{baseHref\}\/\$\{value\}`\)/);
  assert.match(page, /<SchoolShell[\s\S]*action=\{/);
  assert.match(page, /Publish school/);
  assert.match(page, /Move to draft/);
  assert.match(page, /tooltip="Edit school"/);
  assert.doesNotMatch(page, /Manage courses/);
  assert.doesNotMatch(
    page,
    /rounded-xl border border-border\/70 bg-background\/60 p-2\.5/,
  );
  assert.match(page, /School status/);
  assert.match(
    page,
    /Published schools can appear in the public school directory/,
  );
  assert.match(constants, /Pending review/);
  assert.match(constants, /Pool training/);
  assert.match(constants, /Use school location/);
  assert.match(constants, /Use course location/);
  assert.match(constants, /Use a different location/);
  assert.match(constants, /Use text-only location/);
  assert.match(constants, /Manual QR/);
  assert.match(constants, /Bank transfer/);
  assert.match(page, /active="settings"/);
  assert.match(page, /Payment setup/);
  assert.match(page, /PaymentMethodsSetup/);
  assert.match(page, /mediaContextType="payment_method_qr"/);
  assert.match(page, /sanitizeSchoolPaymentMethodRequest/);
  assert.match(page, /qrImageUrl: _qrImageUrl/);
  assert.doesNotMatch(page, /data as CreateCoursePaymentMethodRequest/);
  assert.doesNotMatch(page, /data as UpdateCoursePaymentMethodRequest/);
  assert.doesNotMatch(overviewSection, /SchoolPaymentMethodsPanel/);
  assert.match(page, /Booking options/);
  assert.match(page, /Students can choose from available schedules/);
  assert.match(page, /Students can request a preferred date/);
  assert.match(page, /Schedules \+ preferred date/);
  assert.match(page, /Booking mode/);
  assert.match(constants, /Schedule selected/);
  assert.match(constants, /Preferred date request/);
  assert.match(
    page,
    /rounded-lg border border-border\/70 bg-background\/70 p-3/,
  );
  assert.match(page, /sm:grid-cols-2 lg:grid-cols-4/);
  assert.match(bookingRow, /DialogTitle>Manage booking/);
  assert.match(bookingRow, /Review the request, assign a session/);
  assert.match(bookingRow, /Settings2/);
  assert.match(bookingRow, />\s*Manage\s*</);
  assert.match(bookingRow, /<article className="py-3">/);
  assert.doesNotMatch(bookingRow, /flex max-w-sm flex-wrap gap-2/);
  assert.doesNotMatch(bookingRow, /SelectTrigger className="min-w-44"/);
  assert.doesNotMatch(page, /setPaymentCourse/);
  assert.doesNotMatch(
    page,
    /courses\/\\$\\{encodeURIComponent\\(courseId\\)\\}\/payment-methods/,
  );
  assert.match(constants, /Scheduled/);
  assert.match(constants, /Completed/);
  assert.doesNotMatch(page, />pending_review</);
  assert.doesNotMatch(page, />pool_training</);
  assert.doesNotMatch(page, />MANUAL_QR</);
});

test("course and session forms use progressive structured location controls", () => {
  const page = read("src/features/schools/pages/ManageSchoolsPage.tsx");

  assert.match(page, /LocationPicker/);
  assert.match(page, /DiveSiteCombobox/);
  assert.match(page, /formatPeso\(course\.priceAmount \?\? 0\)/);
  assert.match(page, /DEFAULT_TIMEZONE/);
  assert.match(page, /courseLocationModeOptions/);
  assert.match(page, /sessionLocationModeOptions/);
  assert.match(page, /locationNote/);
  assert.match(
    page,
    /locationMode: initial\?\.locationMode \?\? "inherit_school"/,
  );
  assert.match(
    page,
    /locationMode: initial\?\.locationMode \?\? firstCourseMode/,
  );
  assert.doesNotMatch(
    page,
    /label="Location"\\s+value=\\{form\\.locationLabel\\}/,
  );
  assert.doesNotMatch(page, /label="Currency"/);
  assert.doesNotMatch(page, /label="Timezone"/);
  assert.doesNotMatch(page, /currency: initial/);
  assert.doesNotMatch(page, /timezone: initial/);
});
