import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");

test("profile create flow and masonry gallery are wired to the media posting stack", async () => {
  const createPage = await fs.readFile(
    path.join(repoRoot, "src/features/profile/pages/CreateProfilePostPage.tsx"),
    "utf8",
  );
  const composer = await fs.readFile(
    path.join(
      repoRoot,
      "src/features/media/components/ProfileMediaComposer.tsx",
    ),
    "utf8",
  );
  const gallery = await fs.readFile(
    path.join(repoRoot, "src/features/profile/components/ProfileGrid.tsx"),
    "utf8",
  );
  const routes = await fs.readFile(
    path.join(repoRoot, "src/lib/api/fphgo-routes.ts"),
    "utf8",
  );

  assert.match(createPage, /ProfileMediaComposer/);
  assert.match(composer, /approved FPH dive-site directory/);
  assert.match(composer, /Caption applies to the whole post/);
  assert.match(composer, /applyCaptionToAll: false/);
  assert.match(composer, /contextType: "profile_feed"/);
  assert.match(gallery, /MasonryPhotoAlbum/);
  assert.match(gallery, /react-photo-album\/masonry\.css/);
  assert.match(routes, /posts: \(\) => "\/v1\/media\/posts"/);
  assert.match(routes, /byUsername:[\s\S]*\/v1\/media\/by-username/);
});

test("media dialog is wired as an in-place social post view", async () => {
  const [mediaCard, profileGrid, socialPanel, actions, comments, detailPage] =
    await Promise.all([
      fs.readFile(
        path.join(
          repoRoot,
          "src/features/home-feed/components/cards/MediaPostCard.tsx",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(repoRoot, "src/features/profile/components/ProfileGrid.tsx"),
        "utf8",
      ),
      fs.readFile(
        path.join(
          repoRoot,
          "src/features/media/components/MediaPostSocialPanel.tsx",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(repoRoot, "src/features/media/components/MediaPostActions.tsx"),
        "utf8",
      ),
      fs.readFile(
        path.join(repoRoot, "src/features/media/components/MediaPostComments.tsx"),
        "utf8",
      ),
      fs.readFile(
        path.join(repoRoot, "src/features/media/pages/MediaPostDetailPage.tsx"),
        "utf8",
      ),
    ]);

  assert.match(mediaCard, /setViewerOpen\(true\)/);
  assert.match(mediaCard, /setCommentFocusSignal/);
  assert.match(mediaCard, /<MediaPostSocialPanel/);
  assert.match(profileGrid, /<MediaPostSocialPanel/);
  assert.match(detailPage, /<MediaPostSocialPanel/);
  assert.match(socialPanel, /<MediaPostActions/);
  assert.match(socialPanel, /onCommentClick=\{focusComments\}/);
  assert.match(socialPanel, /<MediaPostComments postId=\{postId\}/);
  assert.match(actions, /onCommentClick\?: \(\) => void/);
  assert.match(actions, /onCommentClick\(\)/);
  assert.match(actions, /render=\{\s*onCommentClick\s*\?\s*undefined\s*:/);
  assert.match(comments, /likeMediaPostComment/);
  assert.match(comments, /unlikeMediaPostComment/);
  assert.match(comments, /aria-label=\{\s*comment\.viewerHasLiked/);
});
