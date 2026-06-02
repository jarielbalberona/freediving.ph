import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(import.meta.dirname, "..");

const readApp = (relativePath) =>
  fs.readFile(path.join(appRoot, relativePath), "utf8");

test("profile Passport UI consumes shared contracts and backend API", async () => {
  const [component, profilesApi, profileApi, hooks, routes, tabs] =
    await Promise.all([
      readApp("src/features/profile/components/ProfilePassport.tsx"),
      readApp("src/features/profiles/api/profiles.ts"),
      readApp("src/features/profile/api/profileApi.ts"),
      readApp("src/features/profile/hooks/queries.ts"),
      readApp("src/lib/api/fphgo-routes.ts"),
      readApp("src/features/profile/components/ProfileTabs.tsx"),
    ]);

  assert.match(component, /ProfilePassport/);
  assert.match(component, /@freediving\.ph\/types/);
  assert.match(profilesApi, /ProfilePassportResponse/);
  assert.match(profileApi, /getProfilePassport/);
  assert.match(hooks, /useProfilePassportQuery/);
  assert.match(routes, /profilePassport/);
  assert.match(
    tabs,
    /<ProfilePassport username=\{username\} isOwner=\{isOwner\} \/>/,
  );
});

test("profile Passport UI exposes empty states without source-truth claims", async () => {
  const component = await readApp(
    "src/features/profile/components/ProfilePassport.tsx",
  );

  assert.match(component, /No proof-backed dive sites are visible here yet\./);
  assert.match(
    component,
    /This diver has not surfaced enough public Passport highlights yet\./,
  );
  assert.match(component, /Your Passport is still sparse\./);
  assert.doesNotMatch(
    component,
    /verified passport|certified passport|rank|score/i,
  );
  assert.doesNotMatch(
    component,
    /verified credential|unlock site|award badge/i,
  );
});

test("profile Passport settings UI stays presentation-only and moves into a dialog", async () => {
  const [component, mutation] = await Promise.all([
    readApp("src/features/profile/components/ProfilePassport.tsx"),
    readApp("src/features/profile/hooks/passport-mutations.ts"),
  ]);

  assert.match(component, /function PassportCustomizeDialog/);
  assert.match(component, /Customize Passport/);
  assert.match(component, /DialogTrigger/);
  assert.match(component, /DialogContent/);
  assert.match(component, /DialogTitle>Customize Passport/);
  assert.match(component, /showMap/);
  assert.match(component, /showBadges/);
  assert.match(component, /showJourney/);
  assert.match(component, /showMemories/);
  assert.match(mutation, /updateMyPassportSettings/);
  const settingsPanel = component.slice(
    component.indexOf("function PassportCustomizeDialog"),
    component.indexOf("function StoryPreview"),
  );
  assert.doesNotMatch(
    settingsPanel,
    /visitedSiteCount|badgeCount|journeyEntryCount/,
  );
  assert.doesNotMatch(mutation, /profileDiveMap|profileJourney|ProfileBadges/);
});

test("profile Passport UI has scoped accessible structure", async () => {
  const component = await readApp(
    "src/features/profile/components/ProfilePassport.tsx",
  );

  assert.match(component, /aria-labelledby="profile-passport-heading"/);
  assert.match(component, /id="profile-passport-heading"/);
  assert.match(component, /function PassportSection/);
  assert.match(component, /<fieldset/);
  assert.match(component, /htmlFor=\{`passport-\$\{key\}`\}/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /aria-hidden="true"/);
  assert.match(component, /eyebrow="Public Showcase"/);
  assert.match(component, /title="Dive footprint"/);
  assert.match(component, /title="Recent story"/);
});
