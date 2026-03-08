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
  assert.match(composer, /Apply to all/);
  assert.match(composer, /contextType: "profile_feed"/);
  assert.match(gallery, /MasonryPhotoAlbum/);
  assert.match(gallery, /react-photo-album\/masonry\.css/);
  assert.match(routes, /posts: \(\) => "\/v1\/media\/posts"/);
  assert.match(routes, /byUsername:[\s\S]*\/v1\/media\/by-username/);
});
