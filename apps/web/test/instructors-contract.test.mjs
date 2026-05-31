import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("instructor application routes and labels are discoverable", () => {
  const applyPage = read("src/app/instructor/apply/page.tsx");
  const profilePage = read("src/app/instructor/profile/page.tsx");
  const certificationsPage = read("src/app/instructor/certifications/page.tsx");
  const page = read(
    "src/features/instructors/pages/InstructorApplicationPage.tsx",
  );
  const detailsFields = read(
    "src/features/instructors/components/InstructorProfileDetailsFields.tsx",
  );
  const certificationsFields = read(
    "src/features/instructors/components/InstructorCertificationsFields.tsx",
  );
  const constants = read("src/features/instructors/constants.ts");
  const nav = read("src/config/nav.ts");

  assert.match(applyPage, /InstructorApplicationPage/);
  assert.match(profilePage, /InstructorApplicationPage/);
  assert.match(certificationsPage, /InstructorApplicationPage/);
  assert.match(nav, /id: "manage-schools"/);
  assert.match(
    nav,
    /MOBILE_SIDEBAR_ORDER: string\[\] = \[\.\.\.APP_DRAWER_NAV_IDS\]/,
  );
  assert.match(page, /Submit for review/);
  assert.match(page, /FPH reviews existing instructor certifications/);
  assert.match(page, /does not mean FPH issued, guarantees, or certifies/);
  assert.match(page, /attestationAccepted/);
  assert.match(page, /LocationPicker/);
  assert.match(detailsFields, /grid min-w-0 gap-3 sm:grid-cols-2/);
  assert.match(detailsFields, /cn\("grid min-w-0 gap-1\.5", className\)/);
  assert.match(
    detailsFields,
    /Where are you mainly based for teaching or freediving/,
  );
  assert.match(certificationsFields, /Certification proof/);
  assert.match(page, /instructor_certification_proof/);
  assert.match(certificationsFields, /Official verification link/);
  assert.match(certificationsFields, /instructorAgencyLabels/);
  assert.match(constants, /Molchanovs/);
  assert.match(constants, /PADI/);
  assert.match(constants, /AIDA/);
  assert.match(constants, /SSI/);
  assert.match(constants, /RAID/);
  assert.match(constants, /Apnea Academy/);
  assert.match(constants, /apnea_academy: "Apnea Academy"/);
  assert.doesNotMatch(page, />apnea_academy</);
  assert.doesNotMatch(page, /Upload proof can be added/);
  assert.doesNotMatch(page, /proof_media_id/);
});

test("school create UI is gated by verified instructor status", () => {
  const page = read("src/features/schools/pages/ManageSchoolsPage.tsx");

  assert.match(page, /useMyInstructorApplication/);
  assert.match(page, /canCreateSchool/);
  assert.match(page, /School creation is available for verified instructors/);
  assert.match(page, /Apply as instructor/);
  assert.match(page, /Your instructor application is under review/);
  assert.match(page, /Your instructor application needs changes/);
});

test("admin instructors review page supports verify and reject actions", () => {
  const adminPage = read("src/app/admin/instructors/page.tsx");
  const adminNav = read("src/app/admin/_components/admin-page.tsx");
  const adminSidebar = read("src/components/layout/admin-sidebar.tsx");
  const appSidebar = read("src/components/ui/app-sidebar.tsx");
  const routes = read("src/lib/api/fphgo-routes.ts");

  assert.match(adminNav, /\/admin\/instructors/);
  assert.match(adminSidebar, /\/admin\/instructors/);
  assert.doesNotMatch(appSidebar, /\/admin\/instructors/);
  assert.match(adminPage, /useVerifyInstructor/);
  assert.match(adminPage, /useRejectInstructor/);
  assert.match(adminPage, /statusOptions/);
  assert.match(adminPage, /Review checklist/);
  assert.match(adminPage, /The certification appears to be instructor-level/);
  assert.match(adminPage, /The verification link works, if provided/);
  assert.match(adminPage, /Reason for changes/);
  assert.match(adminPage, /View proof/);
  assert.doesNotMatch(adminPage, /Proof media:/);
  assert.match(adminPage, /Verify/);
  assert.match(adminPage, /Reject/);
  assert.match(routes, /\/v1\/admin\/instructors/);
});
