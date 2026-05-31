# 03 Media Posts, Comments, And Deep Links

Status: Ready After Previous
Ready for execution: yes
Execution started: no
Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.
PASS criterion: mobile media posts have routeable detail views, social actions, comments, save behavior, and deep-link handling aligned with web contracts.

## Readiness Rationale

This is sequence-gated, not blocked. Existing mobile composer/outbox behavior and shared media contracts give a safe implementation path; profile entry points are improved by running after `02`.

## 1. Purpose

Make mobile media posts first-class objects rather than only inline feed/profile cards.

## 2. Scope

- Media post detail route/screen.
- Open media posts from feed, profile, notification, and deep link.
- Like/unlike.
- Comment list/create/delete if supported.
- Comment-like if supported.
- Save/bookmark if supported.
- Native full-screen media viewer.
- Share/copy link if supported.
- Preserve composer/upload/outbox behavior.

## 3. Explicit Non-Goals

- Rebuilding the media composer unless required for detail parity.
- Backend changes unless a real contract gap exists.
- Unrelated profile/feed work.

## 4. Dependencies

- `01-auth-onboarding-account-setup.md`
- Prefer `02-profile-core-badges-dive-identity.md` completed for profile entry points.

## 5. Files And Areas Likely Involved

- `apps/mobile/src/features/media/**`
- `apps/mobile/src/features/home-feed/**`
- `apps/mobile/src/features/profiles/**`
- `apps/mobile/src/features/notifications/**`
- `apps/mobile/src/features/shared/links/**`
- `packages/types/src/media.ts`

## 6. Existing Web Source Of Truth

- `apps/web/src/app/[username]/posts/[postId]/page.tsx`
- `apps/web/src/features/media/pages/MediaPostDetailPage.tsx`
- `apps/web/src/features/media/components/MediaPostComments.tsx`
- `MediaPostLikeButton.tsx`, `MediaViewerDialog.tsx`

## 7. Existing Mobile Implementation Status

Mobile has media composer, profile media grid, feed media rendering, media comments sheet, and media mutation hooks. No route-equivalent detail page was found.

## 8. Backend/Shared Contract Status

Media upload, post detail, likes, saves, comments, comment likes, and profile media contracts exist in `packages/types/src/media.ts` and fphgo media routes.

## 9. Implementation Steps

1. Add mobile route for media post detail.
2. Add media post detail query/hook if absent.
3. Wire feed/profile/notification/deep-link navigation.
4. Add social actions and comments using existing contracts.
5. Add full-screen viewer using native/mobile libraries already present.
6. Add tests for route resolution and social states.

## 10. Role/Auth/Privacy Rules

Public visibility and owner/comment permissions must come from backend. Mutations require authenticated token and must respect block/privacy responses.

## 11. UX Rules For Native Mobile

Use native image/video presentation and bottom-sheet style actions; do not copy web dialogs.

## 12. Data/Source-Of-Truth Rules

Do not treat media local drafts/outbox as server truth. Server response controls persisted media state, likes, saves, and comments.

## 13. Implementation Guards

- Stop if the backend lacks a detail endpoint for the route.
- Stop if comment-delete ownership policy is not exposed.
- Preserve existing upload/outbox behavior.

## 14. Acceptance Criteria

- Media post links open a mobile detail screen.
- Likes/saves/comments work or show backend errors cleanly.
- Loading/error/empty states are covered.
- Composer behavior is unchanged.

## 15. Verification Commands

- `pnpm --filter @freediving.ph/mobile test`
- `pnpm --filter @freediving.ph/mobile type-check`
- `git diff --check`

### iOS Simulator Smoke Test

Required when this initiative changes mobile UI/navigation/runtime behavior.

Suggested flow:
1. Launch the mobile app in an iOS Simulator using the repo-supported command.
2. Confirm the app opens without redbox/runtime crash.
3. Navigate to each screen changed by this initiative.
4. Confirm loading, empty, error, and success states where practical.
5. Confirm primary actions open the expected sheet/screen/form.
6. Confirm back navigation works.
7. Confirm there are no obvious layout breaks on a standard iPhone simulator.
8. Record simulator/device, command used, result, and any runtime errors.

If simulator testing cannot be run, document the blocker and include a manual checklist.

## 16. Manual Smoke Checklist

- Open media from home feed.
- Open media from profile grid.
- Create, like, unlike, save, unsave, comment, and delete own comment where allowed.
- Open copied/deep link.

## 17. Rollback/Risk Notes

Rollback route and media detail changes. Risk is broken deep links or duplicate mutation state.

## 18. Handoff Notes For The Next Initiative

After media detail routing is stable, Chika can receive similar deep-link and action reliability treatment.
