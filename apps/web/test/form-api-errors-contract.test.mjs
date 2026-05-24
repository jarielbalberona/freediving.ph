import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web"))
  ? cwd
  : path.join(cwd, "apps", "web");

test("API validation issues are mapped into React Hook Form fields", async () => {
  const source = await readFile(
    path.join(appRoot, "src/lib/forms/api-errors.ts"),
    "utf8",
  );

  assert.match(source, /export function applyApiErrorsToForm/);
  assert.match(source, /UseFormSetError/);
  assert.match(source, /fieldMap/);
  assert.match(source, /setError\(fieldError\.field/);
  assert.match(source, /globalMessages/);
  assert.match(source, /getApiError\(error\)/);
});

test("School management form uses the reusable API-to-RHF error mapper", async () => {
  const source = await readFile(
    path.join(appRoot, "src/features/schools/pages/ManageSchoolsPage.tsx"),
    "utf8",
  );

  assert.match(source, /useForm<SchoolFormValues>/);
  assert.match(source, /zodResolver\(schoolFormSchema\)/);
  assert.match(source, /applyApiErrorsToForm\(form, error/);
  assert.match(source, /schoolApiFieldMap/);
  assert.match(source, /<FormField[\s\S]*name="contactEmail"/);
  assert.match(source, /<FormField[\s\S]*name="websiteUrl"/);
});

test("Profile settings form uses RHF, Zod, Form primitives, and API error mapping", async () => {
  const [pageSource, schemaSource] = await Promise.all([
    readFile(
      path.join(appRoot, "src/features/profile/pages/ProfileSettingsPage.tsx"),
      "utf8",
    ),
    readFile(
      path.join(
        appRoot,
        "src/features/profile/schemas/profile-settings.schema.ts",
      ),
      "utf8",
    ),
  ]);

  assert.match(pageSource, /useForm<ProfileSettingsValues>/);
  assert.match(pageSource, /zodResolver\(profileSettingsSchema\)/);
  assert.match(pageSource, /applyApiErrorsToForm\(form, error/);
  assert.match(pageSource, /<FormField[\s\S]*name="displayName"/);
  assert.match(pageSource, /<FormField[\s\S]*name="bio"/);
  assert.match(schemaSource, /max\(80/);
  assert.match(schemaSource, /max\(500/);
});
