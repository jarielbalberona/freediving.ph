import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(import.meta.dirname, "..");

const readApp = (relativePath) =>
  fs.readFile(path.join(appRoot, relativePath), "utf8");

test("profile Dive Memories page uses the dedicated slug-based page contract", async () => {
  const [
    page,
    component,
    profilesApi,
    profileApi,
    hooks,
    mutations,
    routes,
    tabs,
  ] = await Promise.all([
    readApp("src/features/profile/pages/ProfileDiveMapEntryPage.tsx"),
    readApp("src/features/profile/components/ProfileDiveMemories.tsx"),
    readApp("src/features/profiles/api/profiles.ts"),
    readApp("src/features/profile/api/profileApi.ts"),
    readApp("src/features/profile/hooks/queries.ts"),
    readApp("src/features/profile/hooks/memory-mutations.ts"),
    readApp("src/lib/api/fphgo-routes.ts"),
    readApp("src/features/profile/components/ProfileTabs.tsx"),
  ]);

  assert.match(page, /useProfileDiveMemoriesPageQuery/);
  assert.doesNotMatch(page, /useProfileDiveMapQuery/);
  assert.doesNotMatch(page, /useProfileDiveMapSiteQuery/);
  assert.match(component, /import type \{ DiveMemory, DiveMemoryVisibility \}/);
  assert.match(component, /items\?: DiveMemory\[\]/);
  assert.match(profilesApi, /ProfileDiveMemoriesResponse/);
  assert.match(profilesApi, /ProfileDiveMemoriesPageResponse/);
  assert.match(profilesApi, /getProfileDiveMemoriesPageByUsername/);
  assert.match(profileApi, /getProfileDiveMemories/);
  assert.match(profileApi, /getProfileDiveMemoriesPage/);
  assert.match(hooks, /useProfileDiveMemoriesQuery/);
  assert.match(hooks, /useProfileDiveMemoriesPageQuery/);
  assert.match(mutations, /useCreateDiveMemory/);
  assert.match(mutations, /useUpdateDiveMemory/);
  assert.match(mutations, /useDeleteDiveMemory/);
  assert.match(routes, /profileDiveMemories/);
  assert.match(routes, /profileDiveMemoriesPage/);
  assert.match(routes, /myDiveMemories/);
  assert.doesNotMatch(
    tabs,
    /<ProfileDiveMemories username=\{username\} isOwner=\{isOwner\} \/>/,
  );
  assert.match(
    tabs,
    /<ProfileDiveMap username=\{username\} isOwner=\{isOwner\} \/>/,
  );
});

test("profile Dive Memories UI stays social and does not claim proof", async () => {
  const [component, page] = await Promise.all([
    readApp("src/features/profile/components/ProfileDiveMemories.tsx"),
    readApp("src/features/profile/pages/ProfileDiveMapEntryPage.tsx"),
  ]);

  assert.match(component, /No visible memories yet/);
  assert.match(component, /Tagged memory requests stay private/);
  assert.match(component, /Delete dive memory/);
  assert.match(component, /visibility/);
  assert.match(page, /proofItems/);
  assert.match(page, /ProfileDiveMemories/);
  assert.doesNotMatch(
    component,
    /unlock|visited-site count|visitedSiteCount|award badge|verified credential/i,
  );
});

test("memory mutations invalidate downstream display reads only", async () => {
  const mutations = await readApp(
    "src/features/profile/hooks/memory-mutations.ts",
  );

  assert.match(mutations, /queryKeys\.profile\.diveMemories/);
  assert.match(mutations, /queryKeys\.profile\.diveMemoriesPages/);
  assert.match(mutations, /queryKeys\.profile\.diveMap/);
  assert.match(mutations, /queryKeys\.profile\.journey/);
  assert.match(mutations, /queryKeys\.profile\.passport/);
  assert.doesNotMatch(mutations, /badges|visitedSiteCount|userDiveSites/i);
});
