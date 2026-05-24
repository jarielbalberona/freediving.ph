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
  const coursePage = read("src/app/schools/[slug]/courses/[courseSlug]/page.tsx");
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
  const constants = read("src/features/schools/constants.ts");

  assert.match(page, /TabsTrigger value="overview"/);
  assert.match(page, /TabsTrigger value="courses"/);
  assert.match(page, /TabsTrigger value="book"/);
  assert.match(page, /Sign in required/);
  assert.match(page, /Preferred date/);
  assert.match(page, /SelectTrigger/);
  assert.match(page, /SelectValue/);
  assert.match(constants, /Pool training/);
  assert.match(constants, /Pending review/);
  assert.match(constants, /Not required/);
  assert.doesNotMatch(page, />pending_review</);
  assert.doesNotMatch(page, />pool_training</);
});

test("admin school form uses LocationSearch and optional dive site selector", () => {
  const page = read("src/features/schools/pages/ManageSchoolsPage.tsx");

  assert.match(page, /LocationSearch/);
  assert.match(page, /DiveSiteCombobox/);
  assert.match(page, /baseLocationLabel/);
  assert.match(page, /diveSiteId/);
});
