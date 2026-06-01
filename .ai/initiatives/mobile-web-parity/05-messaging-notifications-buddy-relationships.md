# 05 Messaging, Notifications, And Buddy Relationships

Status: PASS WITH ISSUES
Ready for execution: yes
Execution started: yes
Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.
PASS criterion: mobile distinguishes Buddy Finder intents from buddy relationships and supports relationship actions, messaging entry points, and notification routing without bypassing backend policy.

## Readiness Rationale

This is sequence-gated, not blocked. Buddy relationship and messaging contracts exist; implementation must reuse backend policy and the canonical relationship state after profile action surfaces are available.

## 1. Purpose

Close the mobile gap around bilateral buddy relationships, message entry, Buddy Finder integration, and notification routing.

## 2. Scope

- Distinguish Buddy Finder intents from actual buddy relationships.
- Send, accept, decline, cancel outgoing, and remove buddy requests/relationships.
- Buddy list plus incoming/outgoing request lists.
- Relationship state on profile.
- Message entry from profile and Buddy Finder where allowed.
- Reuse existing message thread if present.
- Notification routing to buddy/message targets.
- Mark-read/delete notification controls if included by existing contracts.

## 3. Explicit Non-Goals

- Bypassing backend policy.
- Duplicate messaging model.
- Realtime unless already established and low-risk.
- Groups, events, schools.

## 4. Dependencies

- `01-auth-onboarding-account-setup.md`
- Prefer `02-profile-core-badges-dive-identity.md` for profile action placement.
- Prefer `16-navigation-deep-linking-platform-hardening.md` for final route coverage, but do not block core actions on it.

## 5. Files And Areas Likely Involved

- `apps/mobile/src/features/buddies/**`
- `apps/mobile/src/features/messages/**`
- `apps/mobile/src/features/notifications/**`
- `apps/mobile/src/features/profiles/**`
- `apps/web/src/features/buddies/api/buddies.ts` as parity reference
- `packages/types/src/index.ts`
- `services/fphgo/internal/features/buddies/**`
- `services/fphgo/internal/features/messaging/**`
- `services/fphgo/internal/features/notifications/**`

## 6. Existing Web Source Of Truth

- `apps/web/src/features/buddies/api/buddies.ts`
- `apps/web/src/app/buddies/**`
- `apps/web/src/features/messages/**`
- `apps/web/src/features/notifications/**`
- `docs/social/buddies.md`
- `docs/social/messaging.md`

## 7. Existing Mobile Implementation Status

Mobile has Buddy Finder intent flows, messages list/thread/send/request handling, and notification list/settings. It lacks dedicated bilateral buddy relationship screens/actions.

## 8. Backend/Shared Contract Status

Backend has buddies, messaging, and notifications features. Web uses buddy request/list APIs. Mobile must reuse those contracts.

## 9. Implementation Steps

1. Add mobile buddy relationship API wrappers using shared contracts.
2. Add profile relationship state/actions where backend payload supports it.
3. Add buddy list and incoming/outgoing request surfaces.
4. Wire message entry from profile and Buddy Finder into existing thread creation/reuse.
5. Wire notification target routing and optional read/delete controls.
6. Add targeted tests for relationship and message entry behavior.

## 10. Role/Auth/Privacy Rules

All relationship and message mutations require auth. Block rules, cooldowns, request state, message request policy, and privacy gates are backend-owned.

## 11. UX Rules For Native Mobile

Use compact request rows, clear pending states, and confirmation for remove buddy. Do not hide backend-denied states behind generic failures.

## 12. Data/Source-Of-Truth Rules

Buddy Finder intents are availability signals, not buddy relationships. Relationship state must come from canonical buddy APIs/profile payloads.

## 13. Implementation Guards

- Stop if profile payload lacks enough relationship state and no buddy preview endpoint can fill it.
- Stop if block/cooldown/message-request behavior would require client guessing.
- Do not implement realtime unless contract is already present.

## 14. Acceptance Criteria

- Users can manage buddy requests and buddy list on mobile.
- Profile shows relationship state and allowed actions.
- Message entry reuses/creates backend thread correctly.
- Notification taps route to buddy/message targets.

## 15. Verification Commands

- `pnpm --filter @freediving.ph/mobile test`
- `pnpm --filter @freediving.ph/mobile type-check`
- `pnpm --filter @freediving.ph/types test` if contracts change
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

- Send request, cancel outgoing, accept incoming, decline incoming, remove buddy.
- Start message from profile.
- Start message from Buddy Finder intent.
- Tap message/buddy notifications.

## 17. Rollback/Risk Notes

Rollback buddy/message/notification mobile changes. Risks are harassment pathways and duplicate threads if backend policy is bypassed.

## 18. Handoff Notes For The Next Initiative

Explore can then show buddy intents and message actions with clearer relationship boundaries.

## Execution Result

Verdict: PASS WITH ISSUES

Completed on: 2026-06-01

Mobile now distinguishes Buddy Finder intents from bilateral buddy relationships. The Buddies screen keeps intent posting/listing separate from a new relationship section for incoming requests, outgoing requests, accepted buddies, and remove/cancel/accept/decline actions. Public profiles now show backend-backed buddy/message actions using canonical buddy request/list state and direct-message thread creation/reuse.

Notifications now support native message route resolution plus mark-read and delete controls using the existing notification endpoints. Buddy Finder message entry continues to use the existing intent message-entry endpoint and opens/reuses canonical messaging threads.

The remaining issue is runtime verification only: iOS Simulator smoke remains environment-blocked because the repo-supported launch command cannot complete CocoaPods/Homebrew setup in this machine context. Static checks passed.

### Files Changed

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
- `.ai/initiatives/mobile-web-parity/reports/05-messaging-notifications-buddy-relationships.md`
- `.ai/state/current-state.md`
- `docs/mobile-web-parity-assessment.md`

### Verification Run

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile ios` BLOCKED by local CocoaPods/Homebrew environment from initiative 01 smoke attempt; no app runtime result claimed.
- `git diff --check` PASS

### Remaining Gaps

- Incoming request accept/decline is available in the Buddies relationship section, not directly on the other user's profile.
- Realtime messaging remains out of scope.
- Destructive remove-buddy currently uses a direct mobile action without an extra confirmation dialog; backend remains canonical.
- iOS Simulator runtime smoke is pending until local CocoaPods/Homebrew tooling is fixed.

### Manual Smoke Checklist

- Send a buddy request from another user's profile.
- Cancel an outgoing request from profile and from Buddies.
- Accept and decline incoming requests from Buddies.
- Remove an accepted buddy.
- Start a message from a profile where backend allows messaging.
- Start a message from a Buddy Finder intent.
- Tap `/messages/{threadId}` and buddy/message notification action URLs.
- Mark a notification read and delete a notification.
