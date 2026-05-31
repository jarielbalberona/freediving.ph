import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(import.meta.dirname, "..");

const readApp = (relativePath) =>
  fs.readFile(path.join(appRoot, relativePath), "utf8");

test("profile Journey UI consumes shared contracts and APIs", async () => {
  const [component, profilesApi, profileApi, hooks, routes, tabs] =
    await Promise.all([
      readApp("src/features/profile/components/ProfileJourney.tsx"),
      readApp("src/features/profiles/api/profiles.ts"),
      readApp("src/features/profile/api/profileApi.ts"),
      readApp("src/features/profile/hooks/queries.ts"),
      readApp("src/lib/api/fphgo-routes.ts"),
      readApp("src/features/profile/components/ProfileTabs.tsx"),
    ]);

  assert.match(component, /import type \{ JourneyEntry \} from "@freediving\.ph\/types"/);
  assert.match(profilesApi, /ProfileJourneyResponse/);
  assert.match(profileApi, /CreateManualJourneyEntryRequest/);
  assert.match(hooks, /useProfileJourneyQuery/);
  assert.match(routes, /profileJourney/);
  assert.match(tabs, /<ProfileJourney username=\{username\} isOwner=\{isOwner\} \/>/);
});

test("profile Journey UI treats entries as storytelling, not proof", async () => {
  const component = await readApp(
    "src/features/profile/components/ProfileJourney.tsx",
  );

  assert.match(component, /No visible journey yet/);
  assert.match(component, /mediaIds\.length/);
  assert.match(component, /item\.type === "custom"/);
  assert.match(component, /Delete journey entry/);
  assert.doesNotMatch(component, /unlock|verified achievement|credential|passport/i);
});
