import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const loadTypescriptModule = (relativePath) => {
  const sourcePath = path.join(root, relativePath);
  const output = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    output,
    {
      module,
      exports: module.exports,
      require: (specifier) => {
        if (specifier === "@freediving.ph/types") return {};
        throw new Error(`Unexpected require: ${specifier}`);
      },
    },
    { filename: sourcePath },
  );
  return module.exports;
};

test("mobile onboarding route is wired into the auth stack", () => {
  const rootLayout = read("app/_layout.tsx");
  const onboardingRoute = read("app/onboarding.tsx");
  const appLayout = read("app/(app)/_layout.tsx");

  assert.match(rootLayout, /<Stack\.Screen name="onboarding" \/>/);
  assert.match(onboardingRoute, /OnboardingScreen/);
  assert.match(appLayout, /getProfileSetupStatus/);
  assert.match(appLayout, /<Redirect href=\{"\/onboarding" as Href\} \/>/);
});

test("profile completion uses backend profile fields, not local UI state", () => {
  const { getProfileSetupStatus } = loadTypescriptModule(
    "src/features/profiles/lib/profile-completion.ts",
  );

  assert.deepEqual(JSON.parse(JSON.stringify(getProfileSetupStatus(null))), {
    hasDisplayName: false,
    hasHomeArea: false,
    isComplete: false,
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(getProfileSetupStatus({
      displayName: "Apo Diver",
      homeArea: "Dauin",
      location: "",
    }))),
    {
      hasDisplayName: true,
      hasHomeArea: true,
      isComplete: true,
    },
  );
  assert.equal(
    getProfileSetupStatus({
      displayName: "Apo Diver",
      homeArea: "",
      location: "Anilao",
    }).isComplete,
    true,
  );
  assert.equal(
    getProfileSetupStatus({
      displayName: "Apo Diver",
      homeArea: "",
      location: "",
    }).isComplete,
    false,
  );
});

test("onboarding screen saves only supported shared profile fields", () => {
  const screen = read("src/features/onboarding/screens/onboarding-screen.tsx");

  assert.match(screen, /useMyProfileQuery/);
  assert.match(screen, /useUpdateMyProfileMutation/);
  assert.match(screen, /displayName: trimmedName/);
  assert.match(screen, /homeArea: trimmedArea/);
  assert.match(screen, /location: trimmedArea/);
  assert.match(screen, /certLevel: certLevel\.trim\(\) \|\| undefined/);
  assert.match(screen, /interests: splitInterests\(interests\)/);
  assert.doesNotMatch(screen, /username:/);
  assert.match(screen, /router\.replace\(\"\/\(app\)\/\(tabs\)\/\(home\)\"\)/);
});

test("settings exposes account setup and sign out remains available", () => {
  const settings = read("src/features/auth/screens/settings-screen.tsx");

  assert.match(settings, /href=\{"\/onboarding" as Href\}/);
  assert.match(settings, /getProfileSetupStatus/);
  assert.match(settings, /signOut/);
});
