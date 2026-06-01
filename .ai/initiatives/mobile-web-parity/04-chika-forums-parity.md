# 04 Chika Forums Parity

Status: PASS WITH ISSUES
Ready for execution: yes
Execution started: yes
Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.
PASS criterion: mobile Chika supports category-aware browsing, reliable thread detail/create/reply/vote behavior, and pseudonymous display aligned with backend rules.

## Readiness Rationale

This is sequence-gated, not blocked. Chika already has real mobile implementation and backend/shared contracts; the parity work is refinement, routing, validation, and error-state hardening.

## 1. Purpose

Bring mobile Chika/forums to functional user-facing parity where mobile behavior matters.

## 2. Scope

- Category filtering.
- Thread list improvements.
- Thread detail deep links.
- Create thread validation/reliability.
- Comments/replies.
- Vote/reaction error handling.
- Pseudonymous category display and actor masking according to product/backend rules.
- Report actions only if existing contracts are ready and scoped.
- Draft/outbox preservation.

## 3. Explicit Non-Goals

- Full web markdown editor unless already cleanly supported.
- Moderator dashboard.
- Groups, events, media unrelated to Chika.

## 4. Dependencies

- `01-auth-onboarding-account-setup.md`
- `16-navigation-deep-linking-platform-hardening.md` is not required first, but this phase must not conflict with it.

## 5. Files And Areas Likely Involved

- `apps/mobile/app/(app)/(tabs)/chika/**`
- `apps/mobile/src/features/chika/**`
- `apps/mobile/src/features/shared/links/**`
- `packages/types/src/index.ts` Chika contracts
- `services/fphgo/internal/features/chika/**` only if a real contract gap exists.

## 6. Existing Web Source Of Truth

- `apps/web/src/app/chika/**`
- `apps/web/src/features/chika/**`
- `docs/social/chika.md`

## 7. Existing Mobile Implementation Status

Mobile has Chika list, detail, create, comments, reactions, local drafts, and outbox behavior. Category filtering and richer deep-link/reliability polish are incomplete.

## 8. Backend/Shared Contract Status

Chika categories, threads, comments, and reactions exist in shared contracts and backend routes.

## 9. Implementation Steps

1. Add category filter UI and query support.
2. Improve thread list loading/error/empty states.
3. Harden slug/deep-link resolution.
4. Improve create-thread validation and failed-submit draft handling.
5. Harden comment/reply/vote error handling and optimistic rollback.
6. Verify pseudonymous display uses server-provided actor labels only.

## 10. Role/Auth/Privacy Rules

Posting, replying, and voting require auth. Category visibility, pseudonymity, hidden/removed states, and actor masking are backend policy outputs.

## 11. UX Rules For Native Mobile

Use compact category chips and simple native text input. Markdown preview can be plain unless product explicitly requires rich editing.

## 12. Data/Source-Of-Truth Rules

Do not derive author identity client-side in pseudonymous categories. Server-provided pseudonym/author display wins.

## 13. Implementation Guards

- Stop if pseudonymous identity semantics are missing from payloads.
- Stop if report actions require a broader safety policy.
- Preserve draft/outbox behavior.

## 14. Acceptance Criteria

- Category filtering works.
- Thread deep links resolve.
- Create/reply/vote flows handle failures without data loss.
- Pseudonymous actors are masked according to backend response.

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

- Filter by category.
- Open a thread by link.
- Create a thread.
- Reply and nested reply.
- Upvote/downvote and test offline/failure draft behavior.

## 17. Rollback/Risk Notes

Rollback Chika screen/API hook changes. Main risk is identity leakage in pseudonymous categories.

## 18. Handoff Notes For The Next Initiative

Messaging, notifications, and buddy relationships can then link into Chika targets reliably.

## Execution Result

Verdict: PASS WITH ISSUES

Completed on: 2026-06-01

Mobile Chika now supports backend category filtering in the thread list. The Chika screen loads categories, renders native category chips, sends the selected category slug to `/v1/chika/threads?category=...`, and keys category-specific thread cache entries correctly. Thread detail deep-link guards, draft/outbox preservation, optimistic rollback paths, nested replies, and reaction handling were verified by focused tests.

Pseudonymous display remains server-authoritative: mobile uses `authorDisplayName` and category pseudonym flags from the backend, and tests guard against deriving or revealing real author fields in comment display.

The remaining issue is runtime verification only: iOS Simulator smoke remains environment-blocked because the repo-supported launch command cannot complete CocoaPods/Homebrew setup in this machine context. Static checks passed.

### Files Changed

- `apps/mobile/src/features/chika/api/chika-api.ts`
- `apps/mobile/src/features/chika/hooks/use-chika-threads-query.ts`
- `apps/mobile/src/features/chika/hooks/use-chika-mutations.ts`
- `apps/mobile/src/features/chika/screens/chika-screen.tsx`
- `apps/mobile/src/lib/query/query-keys.ts`
- `apps/mobile/test/chika-forums-parity.test.mjs`
- `.ai/initiatives/mobile-web-parity/reports/04-chika-forums-parity.md`
- `.ai/state/current-state.md`
- `docs/mobile-web-parity-assessment.md`

### Verification Run

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile ios` BLOCKED by local CocoaPods/Homebrew environment from initiative 01 smoke attempt; no app runtime result claimed.
- `git diff --check` PASS

### Remaining Gaps

- Full web markdown editor remains intentionally out of scope.
- Report actions remain out of scope for the later user-safety/report/block initiative.
- Realtime Chika updates remain out of scope.
- iOS Simulator runtime smoke is pending until local CocoaPods/Homebrew tooling is fixed.

### Manual Smoke Checklist

- Open Chika and switch between All plus each category chip.
- Open a thread by tapping a card and by a `/chika/{slug}` public link.
- Create a thread in a category and confirm it appears in the matching filtered list.
- Reply, nested reply, upvote, downvote, and retry after a simulated failure/offline state.
- Confirm pseudonymous categories show backend-provided labels and do not reveal usernames/avatar identity.
