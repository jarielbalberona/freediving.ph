# 04 Chika Forums Parity Report

Date: 2026-06-01

Verdict: PASS WITH ISSUES

## Summary

Mobile Chika now has backend category filtering and tighter parity guardrails around deep links, reactions, draft preservation, and pseudonymous display. The implementation uses the existing Chika contracts and backend policy outputs; no local identity derivation or moderator/admin work was added.

## Implemented Items

- Added category query support to the mobile Chika thread API.
- Added category-aware thread query keys.
- Added category chips to the mobile Chika list screen.
- Updated Chika mutation cache updates to cover category-filtered thread lists.
- Added focused tests for category filtering, pseudonymous server labels, deep-link guards, draft preservation, and rollback paths.

## Files Changed

- `apps/mobile/src/features/chika/api/chika-api.ts`
- `apps/mobile/src/features/chika/hooks/use-chika-threads-query.ts`
- `apps/mobile/src/features/chika/hooks/use-chika-mutations.ts`
- `apps/mobile/src/features/chika/screens/chika-screen.tsx`
- `apps/mobile/src/lib/query/query-keys.ts`
- `apps/mobile/test/chika-forums-parity.test.mjs`
- `.ai/initiatives/mobile-web-parity/04-chika-forums-parity.md`
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
- Full markdown editor parity remains out of scope.
- Report actions are deferred to user-safety/report/block scope.
- Realtime Chika updates remain out of scope.

## Manual Smoke Checklist

- Open Chika and verify All/category chips filter the thread list.
- Open a thread from the list and from a `/chika/{slug}` link.
- Create a thread in a selected category.
- Reply, nested reply, upvote/downvote a thread, and upvote/downvote a reply.
- Simulate a failed reply/reaction and confirm draft/outbox messaging preserves the user input.
- Confirm pseudonymous categories do not show real usernames or avatars unless the backend response explicitly exposes allowed labels.

## Handoff

Proceed to `05-messaging-notifications-buddy-relationships.md`. Chika notification/deep-link targets now have a stable native path.
