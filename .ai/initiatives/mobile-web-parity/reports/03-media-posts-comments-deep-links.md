# 03 Media Posts, Comments, And Deep Links Report

Date: 2026-06-01

Verdict: PASS WITH ISSUES

## Summary

Mobile media posts now have a first-class native detail route. The route is backed by the existing media detail endpoint and shared DTOs, not a local mobile aggregate. Feed cards, profile media grids, notification action URLs, and public web post URLs can route into the native detail screen.

The screen supports full-screen gallery viewing through the existing mobile gallery component, like/unlike, save/unsave, native share, and the existing comments sheet with create/delete/comment-like support. Existing composer/upload/outbox behavior was preserved.

## Implemented Items

- Added native media detail route at `apps/mobile/app/(app)/(tabs)/(home)/media/[postId].tsx`.
- Added media detail query and query key.
- Added mobile API functions for media post detail, like/unlike, save/unsave.
- Added media post like/save mutation hooks that update detail/feed cache and invalidate profile reads.
- Wired feed media posts to the media detail route.
- Added profile grid open-post entry point.
- Updated public link resolver so `/{username}/posts/{postId}` and `/profile/{username}/posts/{postId}` open native media detail.
- Kept notification routing through the shared resolver, so media action URLs now work natively.
- Added focused parity tests for media route/API/social/deep-link coverage.

## Files Changed

- `apps/mobile/app/(app)/(tabs)/(home)/_layout.tsx`
- `apps/mobile/app/(app)/(tabs)/(home)/media/[postId].tsx`
- `apps/mobile/src/features/media/api/media-api.ts`
- `apps/mobile/src/features/media/hooks/use-media-post-detail-query.ts`
- `apps/mobile/src/features/media/hooks/use-media-mutations.ts`
- `apps/mobile/src/features/media/screens/media-post-detail-screen.tsx`
- `apps/mobile/src/features/home-feed/components/mobile-feed-items.tsx`
- `apps/mobile/src/features/home-feed/lib/activity-card-model.ts`
- `apps/mobile/src/features/profiles/components/profile-media-masonry-grid.tsx`
- `apps/mobile/src/features/shared/links/lib/resolve-fph-link.ts`
- `apps/mobile/src/features/shared/links/__tests__/resolve-fph-link.test.ts`
- `apps/mobile/test/media-posts-parity.test.mjs`
- `apps/mobile/test/resolve-fph-link.test.mjs`
- `.ai/initiatives/mobile-web-parity/03-media-posts-comments-deep-links.md`
- `.ai/state/current-state.md`
- `docs/mobile-web-parity-assessment.md`

## Verification

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile ios` BLOCKED by local iOS dependency/toolchain setup already observed during initiative 01: Expo attempted CocoaPods installation, `gem install cocoapods --no-document` exited non-zero, and fallback Homebrew install failed with `spawn brew ENOENT`.
- `git diff --check` PASS

## Remaining Gaps

- iOS Simulator runtime smoke remains pending until local CocoaPods/Homebrew tooling is fixed.
- Dedicated clipboard copy-link is not implemented because the mobile app has no clipboard dependency; native `Share.share` covers supported sharing.
- Standalone media library parity remains out of scope.

## Manual Smoke Checklist

- Open media post from home feed.
- Open media post from profile grid.
- Open a notification action URL pointing to a media post.
- Open `https://freediving.ph/{username}/posts/{postId}` and confirm native routing.
- Like/unlike and save/unsave a post.
- Open comments, create a comment, like/unlike a comment, and delete your own comment.
- Tap the media in detail and confirm full-screen gallery open/dismiss behavior.
- Confirm Create tab composer/upload/outbox behavior is unchanged.

## Handoff

Proceed to `04-chika-forums-parity.md`. Chika already has list/detail/create/comment/reaction flows; the next pass should tighten category filtering, deep-link behavior, and error handling without porting the full web markdown editor.
