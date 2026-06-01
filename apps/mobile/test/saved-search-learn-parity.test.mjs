import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("mobile saved and search use existing backend contracts", () => {
  const profileApi = read("src/features/profiles/api/profiles-api.ts");
  const searchHooks = read("src/features/search/hooks/use-search-queries.ts");

  assert.match(profileApi, /SavedHubResponse/);
  assert.match(profileApi, /SearchUsersResponse/);
  assert.match(profileApi, /\/v1\/me\/saved/);
  assert.match(profileApi, /\/v1\/users\/search/);
  assert.match(searchHooks, /getExploreSites/);
  assert.doesNotMatch(searchHooks, /globalSearch|admin|management/);
});

test("mobile search route exposes scoped people, dive-site, and saved surfaces", () => {
  const screen = read("src/features/search/screens/search-screen.tsx");
  const savedRoute = read("app/(app)/(tabs)/(home)/saved.tsx");

  assert.match(screen, /People/);
  assert.match(screen, /Dive sites/);
  assert.match(screen, /Saved/);
  assert.match(screen, /\/\(app\)\/\(tabs\)\/\(home\)\/profile\/\[username\]/);
  assert.match(screen, /\/\(app\)\/\(tabs\)\/\(home\)\/explore\/\[slug\]/);
  assert.match(savedRoute, /initialScope="saved"/);
  assert.doesNotMatch(screen, /Search is coming soon/i);
});

test("learn and founder note placeholders are replaced with native content", () => {
  const learn = read("app/(app)/(tabs)/(home)/learn.tsx");
  const founder = read("app/(app)/(tabs)/(home)/founders-note.tsx");

  assert.match(learn, /How to start freediving/);
  assert.match(learn, /Safety basics/);
  assert.match(founder, /The goal is not to replace real local communities/);
  assert.doesNotMatch(learn, /NavPlaceholderScreen/);
  assert.doesNotMatch(founder, /NavPlaceholderScreen/);
});
