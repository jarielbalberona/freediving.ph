import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("mobile Chika list supports backend category filtering", () => {
  const api = read("src/features/chika/api/chika-api.ts");
  const query = read("src/features/chika/hooks/use-chika-threads-query.ts");
  const screen = read("src/features/chika/screens/chika-screen.tsx");
  const keys = read("src/lib/query/query-keys.ts");

  assert.match(api, /category: params\.category/);
  assert.match(query, /useChikaThreadsQuery = \(category\?: string\)/);
  assert.match(query, /getChikaThreads\(\{ category, limit: CHIKA_THREAD_LIMIT \}\)/);
  assert.match(keys, /threadList: \(params: \{ category\?: string; limit\?: number \}\)/);
  assert.match(screen, /useChikaCategoriesQuery/);
  assert.match(screen, /selectedCategory/);
  assert.match(screen, /setSelectedCategory\(category\.slug\)/);
});

test("mobile Chika preserves pseudonymous server labels and deep-link guards", () => {
  const threadCard = read("src/features/chika/components/chika-thread-card.tsx");
  const commentCard = read("src/features/chika/components/chika-comment-card.tsx");
  const detail = read("src/features/chika/screens/chika-thread-detail-screen.tsx");
  const format = read("src/features/chika/lib/chika-format.ts");
  const resolver = read("src/features/shared/links/lib/resolve-fph-link.ts");

  assert.match(format, /authorDisplayName\?\.trim\(\)/);
  assert.doesNotMatch(format, /authorUsername/);
  assert.match(threadCard, /categoryPseudonymous \? "Anonymous" : authorLabel/);
  assert.match(commentCard, /comment\.authorDisplayName \|\| "Community member"/);
  assert.doesNotMatch(commentCard, /realAuthorUserId/);
  assert.match(detail, /safeChikaSlug/);
  assert.match(detail, /threadQuery\.data && safeChikaSlug\(threadQuery\.data\.slug\) === slug/);
  assert.match(resolver, /parts\[0\] === "chika"/);
});

test("mobile Chika keeps draft and rollback paths for create, reply, and reactions", () => {
  const post = read("src/features/chika/screens/chika-post-screen.tsx");
  const detail = read("src/features/chika/screens/chika-thread-detail-screen.tsx");
  const mutations = read("src/features/chika/hooks/use-chika-mutations.ts");

  assert.match(post, /Save as draft/);
  assert.match(post, /Could not publish in Chika\. Saved as draft\./);
  assert.match(detail, /shouldFallbackToLocalChikaState/);
  assert.match(detail, /chika_thread_reaction/);
  assert.match(detail, /chika_comment_reaction/);
  assert.match(detail, /Saved as draft/);
  assert.match(mutations, /previousDetail/);
  assert.match(mutations, /previousLists/);
  assert.match(mutations, /previousComments/);
  assert.match(mutations, /onError/);
});
