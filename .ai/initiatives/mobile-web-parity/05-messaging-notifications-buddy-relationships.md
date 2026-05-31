# 05 Messaging, Notifications, And Buddy Relationships

Status: Ready After Previous
Ready for execution: yes
Execution started: no
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
