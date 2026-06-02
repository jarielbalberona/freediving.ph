import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(import.meta.dirname, "..");

const readApp = (relativePath) =>
  fs.readFile(path.join(appRoot, relativePath), "utf8");

test("profile Dive Memories page keeps the dedicated slug-based page contract", async () => {
  const [page, component, profilesApi, profileApi, hooks, routes, tabs] =
    await Promise.all([
      readApp("src/features/profile/pages/ProfileDiveMapEntryPage.tsx"),
      readApp("src/features/profile/components/ProfileDiveMemories.tsx"),
      readApp("src/features/profiles/api/profiles.ts"),
      readApp("src/features/profile/api/profileApi.ts"),
      readApp("src/features/profile/hooks/queries.ts"),
      readApp("src/lib/api/fphgo-routes.ts"),
      readApp("src/features/profile/components/ProfileTabs.tsx"),
    ]);

  assert.match(page, /useProfileDiveMemoriesPageQuery/);
  assert.doesNotMatch(page, /useProfileDiveMapQuery/);
  assert.doesNotMatch(page, /useProfileDiveMapSiteQuery/);
  assert.match(page, /getDiveMemoriesCreateRoute/);
  assert.match(page, /filterDiveSiteId=\{site\.diveSiteId\}/);
  assert.match(component, /items\?: DiveMemory\[\]/);
  assert.match(profilesApi, /ProfileDiveMemoriesPageResponse/);
  assert.match(profileApi, /getProfileDiveMemoriesPage/);
  assert.match(hooks, /useProfileDiveMemoriesPageQuery/);
  assert.match(routes, /profileDiveMemoriesPage/);
  assert.doesNotMatch(
    tabs,
    /<ProfileDiveMemories username=\{username\} isOwner=\{isOwner\} \/>/,
  );
});

test("Dive Memories page uses Media and Posts tabs only", async () => {
  const page = await readApp("src/features/profile/pages/ProfileDiveMapEntryPage.tsx");

  assert.match(page, /<TabsTrigger value="media">Media<\/TabsTrigger>/);
  assert.match(page, /<TabsTrigger value="posts">Posts<\/TabsTrigger>/);
  assert.doesNotMatch(page, /<TabsTrigger value="proof">Proof<\/TabsTrigger>/);
  assert.doesNotMatch(page, /<TabsTrigger value="text">Text<\/TabsTrigger>/);
  assert.match(page, /Photos and videos from this location/);
  assert.match(page, /Posts from this dive/);
});

test("Dive Memories page removes the inline form and uses a dedicated create route", async () => {
  const [
    page,
    component,
    createPage,
    createRoute,
    routeHelpers,
    mediaComposer,
    memoryComposer,
    memoryMutations,
  ] =
    await Promise.all([
      readApp("src/features/profile/pages/ProfileDiveMapEntryPage.tsx"),
      readApp("src/features/profile/components/ProfileDiveMemories.tsx"),
      readApp("src/features/profile/pages/CreateDiveMemoryPostPage.tsx"),
      readApp("src/app/dive-memories/[entrySlug]/[username]/new/page.tsx"),
      readApp("src/lib/routes.ts"),
      readApp("src/features/media/components/ProfileMediaComposer.tsx"),
      readApp("src/features/profile/components/DiveMemoryMediaComposer.tsx"),
      readApp("src/features/profile/hooks/memory-mutations.ts"),
    ]);

  assert.match(page, /showCreateComposer=\{false\}/);
  assert.match(page, /Create post/);
  assert.match(page, /Share memory/);
  assert.doesNotMatch(page, /<TabsTrigger value="proof">/);
  assert.match(component, /showCreateComposer\?: boolean/);
  assert.match(component, /headerAction\?: ReactNode/);
  assert.match(createPage, /DiveMemoryMediaComposer/);
  assert.doesNotMatch(createPage, /ProfileMediaComposer/);
  assert.match(createPage, /diveSiteId=\{pageQuery\.data\.site\.diveSiteId\}/);
  assert.match(createPage, /router\.replace\(pageHref\)/);
  assert.match(memoryComposer, /useCreateDiveMemory/);
  assert.match(memoryComposer, /contextType: "profile_feed"/);
  assert.match(memoryComposer, /Publish memory/);
  assert.match(memoryComposer, /mediaIds/);
  assert.doesNotMatch(memoryComposer, /useCreateMediaPost|useCreateMomentUploadIntent|Upload Moment/);
  assert.match(memoryMutations, /useCreateDiveMemory/);
  assert.match(mediaComposer, /lockedDiveSite\?: ExploreSiteCard \| null/);
  assert.match(mediaComposer, /cancelHref\?: string/);
  assert.match(createRoute, /CreateDiveMemoryPostPage/);
  assert.match(routeHelpers, /getDiveMemoriesCreateRoute/);
});

test("Dive Memories media view reuses shared viewer patterns without fake proof UI", async () => {
  const page = await readApp("src/features/profile/pages/ProfileDiveMapEntryPage.tsx");

  assert.match(page, /MasonryPhotoAlbum/);
  assert.match(page, /MediaViewerDialog/);
  assert.match(page, /MomentPlayer/);
  assert.match(page, /label: "Location post"/);
  assert.match(page, /label: "Memory"/);
  assert.doesNotMatch(page, /Proof and memories stay separate here/);
  assert.doesNotMatch(page, /Proof posts and memory uploads share this view/);
  assert.doesNotMatch(page, /Proof-backed media post/);
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
