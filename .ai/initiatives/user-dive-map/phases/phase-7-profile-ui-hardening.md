# Phase 7: Profile UI Hardening

Status: pending

## Objective

Harden the profile Dive Map UI after initial rendering exists, without expanding into deferred memory or downstream product scope.

## Goal

Ensure profile Dive Map UI states are stable, accessible, responsive, and honest about proof-based V1 behavior.

## Scope

- `apps/web/src/features/profile`
- Existing profile routes under `apps/web/src/app/profile/[username]` and `apps/web/src/app/[username]` as applicable.
- Existing API client and hook patterns under `apps/web/src/features/profile`.
- Shared contracts from `@freediving.ph/types`.
- Web tests following existing conventions.

## Out Of Scope

- No backend feature expansion beyond direct contract mismatch fixes.
- No Dive Memories UI.
- No badges, Journey, Passport, favorites, want-to-visit, manual counts, region grouping, or advanced filters.
- No unrelated profile redesign.

## Non-Goals

- Do not calculate unlock status in the browser.
- Do not calculate visited-site count in the browser.
- Do not imply shared/tagged memories are part of V1.
- Do not make the profile Dive Map a Passport surface.

## Inputs

- Phase 5 profile Dive Map UI.
- Phase 6 hardening evidence.
- Existing profile page/component conventions.
- AGENTS rule to prefer shadcn/ui composition and existing file structure.

## Tasks

- Review and harden empty, loading, error, populated, and locked-detail states.
- Ensure marker detail copy and layout presents proof media as user-owned proof, not formal verification.
- Ensure UI does not mention or render shared/tagged memories in V1.
- Ensure owner/public viewer controls are consistent with backend fields.
- Ensure responsive layout and text overflow are acceptable within existing test/static-check limits.
- Add or update relevant web tests where local conventions support them.

## Verification Requirements

- Web type-check is mandatory.
- Tests or documented static evidence must show empty and locked states do not imply manual visits or memory-driven unlocks.

## Verification Commands

- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web lint`
- `git diff -- apps/web packages/types`
- `git diff --check`

## Expected Evidence

- Web type-check passes.
- Relevant web tests pass.
- UI consumes shared contracts from `packages/types`.
- Empty state works for users with no unlocked dive sites.
- Marker detail shows own qualifying proof media only.
- No shared/tagged memory UI is added.

## Repair Policy

Allowed repairs:

- TypeScript compile failures
- lint failures
- test failures inside changed web/profile modules
- contract import/export mismatches
- formatting issues
- minor accessible markup fixes

Hard-stop for unresolved UX decision about map presentation, missing API contract needed by UI, or auth/visibility uncertainty that would require guessing client behavior.

## Stop Conditions

- Required map presentation is unclear enough to affect implementation.
- Backend contracts do not provide the fields needed to render without guessing.
- Existing profile layout cannot accept the section without a broader UX decision.
- UI hardening requires Dive Memories or tagged-user sharing behavior.

## Expected Report Output

- Profile files changed.
- API hooks/client changes if any.
- UI states hardened.
- Verification evidence for type-check, tests, and lint.
- Confirmation no memory UI or downstream product UI was added.

## Completion Notes

Filled by the execution skill or runner.
