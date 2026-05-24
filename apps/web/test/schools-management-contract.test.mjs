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

  assert.match(nav, /manage-schools/);
  assert.match(nav, /Manage Schools/);
  assert.match(nav, /href: "\/manage\/schools"/);
  assert.match(listPage, /ManageSchoolsPage/);
  assert.match(overviewPage, /ManageSchoolOverviewPage/);
  assert.match(coursesPage, /ManageCoursesPage/);
  assert.match(bookingsPage, /ManageBookingsPage/);
  assert.match(sessionsPage, /ManageSessionsPage/);
  assert.doesNotMatch(nav + listPage + overviewPage, /manange/);
});

test("schools management UI uses friendly labels and Base UI Select wrapper", () => {
  const page = read("src/features/schools/pages/ManageSchoolsPage.tsx");
  const constants = read("src/features/schools/constants.ts");

  assert.match(page, /SelectField/);
  assert.match(page, /SelectTrigger/);
  assert.match(page, /SelectValue/);
  assert.match(constants, /Pending review/);
  assert.match(constants, /Pool training/);
  assert.match(constants, /Use school location/);
  assert.match(constants, /Use course location/);
  assert.match(constants, /Use a different location/);
  assert.match(constants, /Use text-only location/);
  assert.match(constants, /Manual QR/);
  assert.match(constants, /Bank transfer/);
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
});
