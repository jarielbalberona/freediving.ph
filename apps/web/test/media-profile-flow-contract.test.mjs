import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");

function assertNoVideoOrIframeInsideButton(source, label) {
  const buttonBlocks = source.match(/<button\b[\s\S]*?<\/button>/g) ?? [];
  for (const block of buttonBlocks) {
    assert.doesNotMatch(
      block,
      /<(video|iframe)\b/,
      `${label} nests video or iframe inside button`,
    );
  }
}

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
  assert.doesNotMatch(createPage, /MomentUploadPanel/);
  assert.match(
    await fs.readFile(
      path.join(repoRoot, "src/app/[username]/create/page.tsx"),
      "utf8",
    ),
    /<CreateProfilePostPage username=\{normalizedUsername\} \/>/,
  );
  assert.match(createPage, /max-w-2xl/);
  assert.match(composer, /approved FPH dive-site directory/);
  assert.match(composer, /TabsTrigger value="photos"/);
  assert.match(composer, /TabsTrigger value="moments"/);
  assert.match(composer, /Caption applies to Photos and Moments/);
  assert.match(composer, /useCreateMomentUploadIntent/);
  assert.match(composer, /useCompleteMomentUpload/);
  assert.match(composer, /form\.getValues\(\)/);
  assert.match(composer, /applyCaptionToAll: false/);
  assert.match(composer, /contextType: "profile_feed"/);
  assert.match(gallery, /MasonryPhotoAlbum/);
  assert.match(gallery, /react-photo-album\/masonry\.css/);
  assert.match(routes, /posts: \(\) => "\/v1\/media\/posts"/);
  assert.match(routes, /byUsername:[\s\S]*\/v1\/media\/by-username/);
});

test("media dialog is wired as an in-place social post view", async () => {
  const [
    feedRenderer,
    mediaPostComponent,
    mediaViewerDialog,
    momentPlayer,
    carousel,
    profileGrid,
    socialPanel,
    actions,
    comments,
    detailPage,
    identityHeader,
  ] = await Promise.all([
    fs.readFile(
      path.join(
        repoRoot,
        "src/features/home-feed/components/FeedItemRenderer.tsx",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "src/features/media/components/MediaPostComponent.tsx",
      ),
      "utf8",
    ),
      fs.readFile(
        path.join(
          repoRoot,
          "src/features/media/components/MediaViewerDialog.tsx",
        ),
        "utf8",
      ),
      fs.readFile(
        path.join(repoRoot, "src/features/media/components/MomentPlayer.tsx"),
        "utf8",
      ),
    fs.readFile(path.join(repoRoot, "src/components/ui/carousel.tsx"), "utf8"),
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
      path.join(
        repoRoot,
        "src/features/media/components/MediaPostComments.tsx",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(repoRoot, "src/features/media/pages/MediaPostDetailPage.tsx"),
      "utf8",
    ),
    fs.readFile(
      path.join(repoRoot, "src/components/common/UserIdentityHeader.tsx"),
      "utf8",
    ),
  ]);

  assert.match(feedRenderer, /MediaPostComponent/);
  assert.match(feedRenderer, /mediaPostFromHomeFeedItem/);
  assert.match(mediaPostComponent, /setViewerOpen\(true\)/);
  assert.match(mediaPostComponent, /<MomentPlayer/);
  assert.match(mediaPostComponent, /momentPlaybackFromUrls/);
  assertNoVideoOrIframeInsideButton(mediaPostComponent, "MediaPostComponent");
  assertNoVideoOrIframeInsideButton(profileGrid, "ProfileGrid");
  assert.match(mediaPostComponent, /setCommentFocusSignal/);
  assert.match(mediaPostComponent, /<MediaPostSocialPanel/);
  assert.match(mediaPostComponent, /commentsScrollMode="desktop"/);
  assert.match(mediaViewerDialog, /h-\[56dvh\]/);
  assert.match(mediaViewerDialog, /h-\[56dvh\][^"]*overflow-hidden/);
  assert.match(mediaViewerDialog, /className="h-full w-full overflow-hidden"/);
  assert.match(mediaViewerDialog, /<MomentPlayer/);
  assert.match(mediaViewerDialog, /videoClassName="object-contain"/);
  assert.doesNotMatch(mediaViewerDialog, /h-\[42dvh\]/);
  assert.match(carousel, /className="h-full w-full overflow-hidden"/);
  assert.match(profileGrid, /<MediaPostSocialPanel/);
  assert.match(profileGrid, /<MomentPlayer/);
  assert.match(profileGrid, /MasonryPhotoAlbum/);
  assert.match(profileGrid, /<Image/);
  assert.match(profileGrid, /commentsScrollMode="desktop"/);
  assert.match(detailPage, /<MediaPostSocialPanel/);
  assert.match(socialPanel, /<UserIdentityHeader/);
  assert.match(socialPanel, /commentsScrollMode\?: "always" \| "desktop"/);
  assert.match(socialPanel, /md:overflow-y-auto/);
  assert.match(socialPanel, /showProfileImage=\{showAuthorProfileImage\}/);
  assert.match(socialPanel, /location=\{/);
  assert.match(identityHeader, /showProfileImage = true/);
  assert.match(
    identityHeader,
    /src=\{showProfileImage \? avatarUrl : undefined\}/,
  );
  assert.match(socialPanel, /<MediaPostActions/);
  assert.match(socialPanel, /onCommentClick=\{focusComments\}/);
  assert.match(socialPanel, /<MediaPostComments postId=\{postId\}/);
  assert.match(actions, /onCommentClick\?: \(\) => void/);
  assert.match(actions, /onCommentClick\(\)/);
  assert.match(actions, /render=\{\s*onCommentClick\s*\?\s*undefined\s*:/);
  assert.match(comments, /likeMediaPostComment/);
  assert.match(comments, /unlikeMediaPostComment/);
  assert.match(comments, /aria-label=\{\s*comment\.viewerHasLiked/);
  assert.match(momentPlayer, /import Hls from "hls\.js"/);
  assert.match(momentPlayer, /video\.canPlayType\("application\/vnd\.apple\.mpegurl"\)/);
  assert.match(momentPlayer, /Hls\.isSupported\(\)/);
  assert.match(momentPlayer, /new Hls\(\)/);
  assert.match(momentPlayer, /hls\.loadSource\(hlsUrl\)/);
  assert.match(momentPlayer, /hls\.attachMedia\(video\)/);
  assert.match(momentPlayer, /hls\.destroy\(\)/);
  assert.match(momentPlayer, /mode === "iframe"/);
  assert.match(momentPlayer, /This Moment is unavailable\./);
  assert.match(momentPlayer, /https:\/\/videodelivery\.net\/\$\{playbackUID\}\/manifest\/video\.m3u8/);
});

test("Moment upload panel previews and validates selected local videos", async () => {
  const [panel, composer, preview] = await Promise.all([
    fs.readFile(
      path.join(
        repoRoot,
        "src/features/media/components/MomentUploadPanel.tsx",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "src/features/media/components/ProfileMediaComposer.tsx",
      ),
      "utf8",
    ),
    fs.readFile(
      path.join(
        repoRoot,
        "src/features/media/components/SelectedVideoPreview.tsx",
      ),
      "utf8",
    ),
  ]);

  assert.match(preview, /URL\.createObjectURL\(file\)/);
  assert.match(preview, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.match(preview, /<video[\s\S]*src=\{previewUrl\}/);
  assert.match(preview, /controls/);
  assert.match(preview, /muted/);
  assert.match(preview, /playsInline/);
  assert.match(preview, /preload="metadata"/);
  assert.match(preview, /video\.videoWidth > 0 && video\.videoHeight > 0/);
  assert.match(
    preview,
    /setAspectRatio\(`\$\{video\.videoWidth\} \/ \$\{video\.videoHeight\}`\)/,
  );
  assert.match(preview, /style=\{aspectRatio \? \{ aspectRatio \} : undefined\}/);
  assert.match(preview, /object-cover/);
  assert.doesNotMatch(preview, /aspect-\[9\/16\]/);
  assert.doesNotMatch(preview, /object-contain/);
  assert.match(preview, /sm:max-w-sm/);
  assert.match(preview, /onLoadedMetadata=\{handleLoadedMetadata\}/);
  assert.match(preview, /MAX_MOMENT_VIDEO_SECONDS = 30/);
  assert.match(preview, /MAX_MOMENT_VIDEO_BYTES = 200 \* 1024 \* 1024/);
  assert.match(preview, /ALLOWED_VIDEO_EXTENSIONS = new Set\(\["mp4", "mov"\]\)/);
  assert.match(preview, /Trim your video before uploading\./);
  assert.match(preview, /Choose an MP4 or MOV video\./);
  assert.doesNotMatch(preview, /<dl/);
  assert.doesNotMatch(preview, />File</);
  assert.doesNotMatch(preview, />Size</);
  assert.doesNotMatch(preview, />Duration</);
  assert.doesNotMatch(preview, /border border-border/);
  assert.match(panel, /<SelectedVideoPreview/);
  assert.match(composer, /<SelectedVideoPreview/);
  assert.match(composer, /className="-mx-3 sm:mx-0"/);
  assert.match(composer, /className="flex min-h-80 w-full flex-col items-center justify-center gap-3 px-4 text-center"/);
  assert.match(composer, /<Film className="size-5" \/>/);
  assert.doesNotMatch(composer, /videoFile \? videoFile\.name/);
  assert.match(composer, /Moments can be up to 30 seconds\./);
  assert.match(composer, /Choose an MP4 or MOV video\./);
  assert.match(composer, /Change video/);
  assert.match(composer, /disabled=\{!canUploadMoment\}/);
  assert.match(composer, /validateSelectedMomentVideo\(nextFile\)/);
  assert.match(composer, /validateMomentDuration\(videoDurationSeconds\)/);
  assert.doesNotMatch(`${panel}\n${composer}\n${preview}`, /ffmpeg/i);
});
