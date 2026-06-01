import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("mobile media posts have a first-class detail route and shared API contract", () => {
  const route = read("app/(app)/(tabs)/(home)/media/[postId].tsx");
  const screen = read("src/features/media/screens/media-post-detail-screen.tsx");
  const api = read("src/features/media/api/media-api.ts");
  const query = read("src/features/media/hooks/use-media-post-detail-query.ts");
  const keys = read("src/lib/query/query-keys.ts");

  assert.match(route, /MediaPostDetailScreen/);
  assert.match(screen, /useMediaPostDetailQuery/);
  assert.match(screen, /MediaPostCommentsSheet/);
  assert.match(screen, /useToggleMediaPostLikeMutation/);
  assert.match(screen, /useToggleMediaPostSaveMutation/);
  assert.match(screen, /MobileMediaGalleryPreview/);
  assert.match(screen, /Share\.share/);
  assert.match(api, /MediaPostDetailResponse/);
  assert.match(api, /MediaPostLikeState/);
  assert.match(api, /MediaPostSaveState/);
  assert.match(api, /\/v1\/media\/posts\/\$\{encodeURIComponent\(postId\)\}/);
  assert.match(query, /mobileQueryKeys\.media\.postDetail/);
  assert.match(keys, /postDetail/);
});

test("feed, profile, notifications, and public links can open media detail", () => {
  const feedModel = read("src/features/home-feed/lib/activity-card-model.ts");
  const feedItems = read("src/features/home-feed/components/mobile-feed-items.tsx");
  const profileGrid = read("src/features/profiles/components/profile-media-masonry-grid.tsx");
  const resolver = read("src/features/shared/links/lib/resolve-fph-link.ts");
  const resolverTests = read("src/features/shared/links/__tests__/resolve-fph-link.test.ts");
  const notificationFormat = read("src/features/notifications/lib/notification-format.ts");

  assert.match(feedModel, /media_post_created/);
  assert.match(feedModel, /\/\(app\)\/\(tabs\)\/\(home\)\/media/);
  assert.match(feedItems, /Open media post/);
  assert.match(profileGrid, /Open media post/);
  assert.match(profileGrid, /encodeURIComponent\(item\.postId\)/);
  assert.match(resolver, /parts\[1\] === "posts"/);
  assert.match(resolverTests, /\/jariel\/posts\/post-1/);
  assert.match(notificationFormat, /resolveFphLink/);
});

test("media social mutations cover like, save, comments, delete, and comment-like", () => {
  const api = read("src/features/media/api/media-api.ts");
  const mutations = read("src/features/media/hooks/use-media-mutations.ts");
  const commentsSheet = read("src/features/media/components/media-post-comments-sheet.tsx");

  for (const symbol of [
    "likeMediaPost",
    "unlikeMediaPost",
    "saveMediaPost",
    "unsaveMediaPost",
    "createMediaPostComment",
    "deleteMediaPostComment",
    "likeMediaPostComment",
    "unlikeMediaPostComment",
  ]) {
    assert.match(api, new RegExp(symbol));
  }

  assert.match(mutations, /useToggleMediaPostLikeMutation/);
  assert.match(mutations, /useToggleMediaPostSaveMutation/);
  assert.match(mutations, /patchMediaPostDetailCommentCount/);
  assert.match(commentsSheet, /Delete comment/);
  assert.match(commentsSheet, /Unlike comment/);
});
