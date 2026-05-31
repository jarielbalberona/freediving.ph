# Phase 5: Web Profile Dive Map UI

Status: passed

## Objective

Render the proof-based Dive Map on profile surfaces using backend-provided state and shared contracts.

## Goal

Add the profile Dive Map UI that displays unlocked sites and opens marker details using backend read APIs and shared contracts.

## Scope

- `apps/web/src/features/profile`
- Existing profile routes under `apps/web/src/app/profile/[username]` and `apps/web/src/app/[username]` as applicable.
- Existing API client and hook patterns under `apps/web/src/features/profile`.
- Reusable map/site components from `apps/web/src/features/explore` or `apps/web/src/features/diveSpots` only if they fit existing conventions.

## Out Of Scope

- No backend changes except fixing contract mismatches from Phase 4.
- No Dive Memories UI.
- No badges, Journey, Passport, favorites, want-to-visit, manual counts, region grouping, or advanced filters.
- No new frontend feature-local API contract `types.ts` files for cross-boundary DTOs.

## Non-Goals

- Do not calculate unlock status in the browser.
- Do not show or imply shared/tagged memories are available in User Dive Map V1.
- Do not add marketing/landing-page treatment; this is a profile product surface.

## Inputs

- Phase 4 contracts and API routes.
- Existing profile page/component conventions.
- `03-cross-module-data-flow.md`
- AGENTS rule to prefer shadcn/ui composition and existing file structure.

## Tasks

- Add API client/hook support for profile Dive Map reads using `@freediving.ph/types`.
- Add a profile Dive Map section with empty, loading, error, and populated states.
- Add marker detail drawer/page/read surface for the user's own qualifying proof posts.
- Ensure the UI does not imply shared memories are part of V1 marker contents.
- Ensure the UI does not show manual visited counts.
- Add or update relevant web tests following existing test conventions.

## Implementation Notes

- Keep the UI consistent with existing profile and shadcn/ui composition patterns.
- Prefer backend response fields over client-side inference.
- If map rendering needs an API key or runtime dependency not available in tests, provide a static/testable fallback state.

## Verification Requirements

- Web type-check is mandatory.
- Tests or documented static evidence must show the locked/empty states do not imply manual visits.

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
- Marker detail does not expose shared/tagged memories.

## Repair Policy

Allowed repairs:

- TypeScript compile failures
- lint failures
- test failures inside changed web/profile modules
- contract import/export mismatches
- formatting issues

Hard-stop for unresolved UX decision about map presentation, missing API contract needed by UI, or auth/visibility uncertainty that would require guessing client behavior.

## Stop Conditions

- Required map presentation is unclear enough to affect implementation.
- Backend contracts do not provide the fields needed to render without guessing.
- Existing profile layout cannot accept the section without a broader UX decision.

## Expected Report Output

- Profile files changed.
- API hooks/client changes.
- UI states implemented.
- Verification evidence for type-check, tests, and lint.

## Completion Notes

2026-05-31: Phase 5 passed. Added web API/client/query support and a profile Dive Map section under the existing Diving tab, with loading, error, empty, marker list, and selected-site proof media states. UI consumes shared `@freediving.ph/types` contracts and backend read APIs. See `../reports/phase-5-web-profile-dive-map-ui.md`.
