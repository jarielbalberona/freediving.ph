import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("mobile Explore list supports search, filters, sort, and saved-only guard", () => {
  const api = read("src/features/explore/api/explore-api.ts");
  const query = read("src/features/explore/hooks/use-explore-sites-query.ts");
  const screen = read("src/features/explore/screens/explore-screen.tsx");
  const keys = read("src/lib/query/query-keys.ts");

  for (const param of [
    "area: params.area",
    "difficulty: params.difficulty",
    "savedOnly: params.savedOnly",
    "search: params.search",
    "verifiedOnly: params.verifiedOnly",
  ]) {
    assert.match(api, new RegExp(param.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(query, /ExploreSiteSortMode = "default" \| "recent" \| "popular"/);
  assert.match(screen, /Search by site, town, or area/);
  assert.match(screen, /filters\.difficulty/);
  assert.match(screen, /filters\.verifiedOnly/);
  assert.match(screen, /filters\.savedOnly && canUseMemberActions/);
  assert.match(screen, /sortSites/);
  assert.match(keys, /savedOnly\?: boolean/);
});

test("mobile Explore detail exposes supported actions and contribution flows", () => {
  const api = read("src/features/explore/api/explore-api.ts");
  const mutations = read("src/features/explore/hooks/use-explore-mutations.ts");
  const relatedQueries = read("src/features/explore/hooks/use-explore-site-related-query.ts");
  const detail = read("src/features/explore/screens/explore-site-detail-screen.tsx");

  for (const endpoint of [
    "/related",
    "/community-posts",
    "/presence",
    "/affinities",
    "/reviews",
    "/edit-proposals",
    "/updates",
  ]) {
    assert.match(api, new RegExp(endpoint));
  }
  for (const hook of [
    "useCreateExploreSiteUpdateMutation",
    "useCreateExploreSiteEditProposalMutation",
    "useCreateExploreSitePresenceMutation",
    "useCreateExploreSiteAffinityMutation",
    "useCreateExploreSiteReviewMutation",
  ]) {
    assert.match(mutations, new RegExp(hook));
  }
  assert.match(relatedQueries, /useExploreSiteRelatedQuery/);
  assert.match(relatedQueries, /useExploreSitePresenceQuery/);
  assert.match(relatedQueries, /useExploreSiteReviewsQuery/);
  assert.match(detail, /Report conditions/);
  assert.match(detail, /Suggest edit/);
  assert.match(detail, /Mark presence/);
  assert.match(detail, /Add local link/);
  assert.match(detail, /Review site/);
});

test("mobile Explore preserves proof-based Dive Map boundary", () => {
  const detail = read("src/features/explore/screens/explore-site-detail-screen.tsx");
  const mutations = read("src/features/explore/hooks/use-explore-mutations.ts");

  assert.match(
    detail,
    /Presence and local affinity are community signals, not proof of a visited site\./,
  );
  assert.doesNotMatch(mutations, /user_dive_sites|diveMap|visited/i);
});
