import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("school management replaces placeholder with backend management contracts", () => {
  const route = read("app/(app)/(tabs)/(home)/manage-schools.tsx");
  const api = read("src/features/schools/api/school-management-api.ts");
  const hooks = read("src/features/schools/hooks/use-school-management.ts");

  assert.match(route, /SchoolManagementScreen/);
  assert.doesNotMatch(route, /NavPlaceholderScreen/);

  assert.match(api, /listManagedSchools/);
  assert.match(api, /getManagedSchool/);
  assert.match(api, /listManagedCourses/);
  assert.match(api, /listManagedSessions/);
  assert.match(api, /listManagedBookings/);
  assert.match(api, /listManagedMembers/);
  assert.match(api, /listManagedPaymentMethods/);
  assert.match(api, /setManagedBookingStatus/);
  assert.match(api, /reviewManagedBookingPayment/);
  assert.match(api, /getManagedBookingPaymentProofUrl/);

  assert.match(hooks, /useManagedSchoolsQuery/);
  assert.match(hooks, /useManagedSchoolWorkspaceQueries/);
  assert.match(hooks, /useManagedBookingStatusMutation/);
  assert.match(hooks, /useManagedBookingPaymentMutation/);
  assert.match(hooks, /useManagedSessionStatusMutation/);
  assert.match(hooks, /getRequiredToken/);
});

test("school management is role-aware and keeps destructive modules guarded", () => {
  const screen = read("src/features/schools/screens/school-management-screen.tsx");
  const resolver = read("src/features/shared/links/lib/resolve-fph-link.ts");

  assert.match(screen, /currentUserRole === "owner"/);
  assert.match(screen, /currentUserRole === "admin"/);
  assert.match(screen, /Read-only instructor/);
  assert.match(screen, /Alert\.alert/);
  assert.match(screen, /Reject booking/);
  assert.match(screen, /Reject payment/);
  assert.match(screen, /Cancel session/);
  assert.match(screen, /Owner\/admin actions/);
  assert.doesNotMatch(screen, /Delete school|Delete course|deleteSchool/);

  assert.match(resolver, /parts\[0\] === "management"/);
  assert.match(resolver, /manage-schools\?slug=/);
});
