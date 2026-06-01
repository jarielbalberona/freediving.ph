import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("mobile instructor parity uses shared member and public contracts", () => {
  const api = read("src/features/instructors/api/instructors-api.ts");

  for (const token of [
    "InstructorApplicationPayload",
    "InstructorCertificationPayload",
    "InstructorSubmitPayload",
    "/v1/instructors/me",
    "/v1/instructors/me/submit",
    "/v1/instructors/me/certifications",
    "/v1/instructors/",
  ]) {
    assert.match(api, new RegExp(token.replaceAll("/", "\\/")));
  }

  assert.doesNotMatch(api, /\/v1\/admin\/instructors/);
  assert.doesNotMatch(api, /verify|reject|suspend/);
});

test("mobile instructor screens expose own application and public profile routes", () => {
  assert.match(
    read("app/(app)/(tabs)/(home)/instructor-application.tsx"),
    /InstructorApplicationScreen/,
  );
  assert.match(
    read("app/(app)/(tabs)/(home)/instructors/[username].tsx"),
    /PublicInstructorScreen/,
  );
  assert.match(
    read("app/(app)/(tabs)/(home)/_layout.tsx"),
    /instructors\/\[username\]/,
  );
});

test("application screen preserves backend instructor rules", () => {
  const screen = read("src/features/instructors/screens/instructor-application-screen.tsx");

  assert.match(screen, /instructor_certification_proof/);
  assert.match(screen, /hasStructuredLocation/);
  assert.match(screen, /certifications\.length === 0/);
  assert.match(screen, /attestationAccepted/);
  assert.match(screen, /status !== "verified" && status !== "pending"/);
  assert.match(screen, /Approved instructors may belong to multiple schools/);
  assert.doesNotMatch(screen, /admin|verifyInstructor|rejectInstructor|suspendInstructor/);
});
