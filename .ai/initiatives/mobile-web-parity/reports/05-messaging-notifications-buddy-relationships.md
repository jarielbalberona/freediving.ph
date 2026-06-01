# 05 Messaging, Notifications, And Buddy Relationships Report

Date: 2026-06-01

Verdict: PASS WITH ISSUES

## Summary

Mobile now separates Buddy Finder intents from bilateral buddy relationships. Relationship actions use the canonical `/v1/buddies` backend endpoints, and messaging entry uses the existing direct-thread backend contract. Notification routing now handles message URLs, and mobile notification cards expose mark-read/delete controls.

## Implemented Items

- Added mobile buddy relationship API wrappers for list, incoming/outgoing requests, send, accept, decline, cancel, remove, and preview.
- Added authenticated buddy relationship queries.
- Added buddy relationship mutations with cache invalidation.
- Added a Buddies screen relationship section for incoming requests, outgoing requests, accepted buddies, and remove/cancel/accept/decline actions.
- Added public profile buddy/message actions based on backend relationship/request state.
- Added direct-message thread open/reuse mutation.
- Added message route support to the shared mobile link resolver.
- Added notification mark-read/delete APIs, mutations, and UI controls.
- Added focused tests for buddy relationship contracts, intent/relationship separation, profile/Buddy Finder message entry, and notification routing/actions.

## Files Changed

- `apps/mobile/src/features/buddies/api/buddies-api.ts`
- `apps/mobile/src/features/buddies/components/buddy-relationship-section.tsx`
- `apps/mobile/src/features/buddies/components/profile-buddy-actions.tsx`
- `apps/mobile/src/features/buddies/hooks/use-buddy-mutations.ts`
- `apps/mobile/src/features/buddies/hooks/use-buddy-relationship-queries.ts`
- `apps/mobile/src/features/buddies/screens/buddies-screen.tsx`
- `apps/mobile/src/features/messages/hooks/use-message-mutations.ts`
- `apps/mobile/src/features/notifications/api/notifications-api.ts`
- `apps/mobile/src/features/notifications/components/notification-card.tsx`
- `apps/mobile/src/features/notifications/hooks/use-notification-mutations.ts`
- `apps/mobile/src/features/notifications/screens/notifications-screen.tsx`
- `apps/mobile/src/features/profiles/screens/public-profile-screen.tsx`
- `apps/mobile/src/features/shared/links/lib/resolve-fph-link.ts`
- `apps/mobile/src/features/shared/links/__tests__/resolve-fph-link.test.ts`
- `apps/mobile/src/lib/query/query-keys.ts`
- `apps/mobile/test/buddy-messaging-notifications-parity.test.mjs`
- `apps/mobile/test/resolve-fph-link.test.mjs`
- `.ai/initiatives/mobile-web-parity/05-messaging-notifications-buddy-relationships.md`
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
- Realtime messaging remains out of scope.
- Incoming request accept/decline lives in the Buddies relationship section; profile shows the state and directs management there.
- Remove-buddy uses a direct action and relies on backend policy; no extra native confirmation dialog was added in this pass.

## Manual Smoke Checklist

- Send a buddy request from a public profile.
- Cancel an outgoing buddy request.
- Accept and decline incoming buddy requests from Buddies.
- Remove an accepted buddy.
- Start a message from a profile.
- Start a message from a Buddy Finder intent.
- Open `/messages/{threadId}` from a notification/action URL.
- Mark a notification read and delete a notification.

## Handoff

Proceed to `06-explore-dive-sites-parity.md`. Explore can now safely link to Buddy Finder/message flows without conflating intents with accepted buddy relationships.
