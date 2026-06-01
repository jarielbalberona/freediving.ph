# 14 User Safety, Report, And Block Report

Date: 2026-06-01
Verdict: PASS

## Summary

Mobile now exposes user-facing safety controls for the backend-supported surfaces in this initiative. Reports use shared report contracts and backend intake. Blocks use shared DTOs and backend block policy. Mobile does not implement moderation dashboards or destructive moderator actions.

## Implemented

- Shared block contracts in `packages/types`.
- Shared report target type alignment with backend report intake.
- Mobile safety API and hooks for reports, blocks, unblocks, and blocked-user list.
- Reusable native report sheet with reason selectors and optional details.
- Profile report/block/unblock controls and blocked relationship messaging.
- Settings blocked-user list with unblock action.
- Chika thread and reply report actions.
- Message report action for non-own text messages.

## Not Implemented

- Moderator/admin report triage.
- Suspension, read-only, identity reveal, shadowban, or hidden moderation controls.
- Report actions for media posts, groups, events, schools, and Explore site updates where the shared report contract does not yet expose a safe target type in mobile UI.
- Runtime mutation smoke that submits real reports or blocks seeded users.

## Verification

- PASS: `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test`
- PASS: `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`
- PASS: `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`
- PASS: `/opt/homebrew/bin/pnpm --filter @freediving.ph/types type-check`
- PASS: `/opt/homebrew/bin/pnpm --filter @freediving.ph/types test`
- PASS: iOS Simulator smoke on iPhone 17 Pro Max with running Expo/Metro.
- PASS: `git diff --check`

## iOS Smoke Evidence

- Public profile safety actions: `/tmp/fph-ios-profile-safety-14.png`
- Settings blocked users: `/tmp/fph-ios-settings-safety-14.png`
- Chika report actions: `/tmp/fph-ios-chika-safety-14.png`
- Messages list route after message-screen integration: `/tmp/fph-ios-messages-safety-14.png`

## Manual Smoke Checklist

- Open another diver profile and confirm Report and Block controls render.
- Open Report on a profile, choose a reason, add optional details, and submit.
- Block a non-critical test user; confirm buddy/message actions become limited after reload.
- Open Settings and unblock the same test user.
- Open a Chika thread and report the thread.
- Report a Chika reply.
- Open a message thread with another user and report a non-own message.
- Confirm duplicate/error states from backend are shown clearly.

## Remaining Gaps

- Media/group/event/school/explore report entry points remain deferred unless shared target contracts and product placement are explicitly added.
- Mobile moderation triage remains initiative 15.
- Real report/block mutation smoke was not run to avoid changing seeded data during automated verification.

## Handoff

Next recommended target is `16-navigation-deep-linking-platform-hardening.md` before role-heavy management initiatives. Safety controls are now present on core user-facing surfaces; management/admin routing should be hardened before exposing organizer/school/admin mobile tools.
