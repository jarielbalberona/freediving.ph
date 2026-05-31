# Phase 8 Report: API/DTO Consistency And Shared Contracts Audit

Date: 2026-05-31

## Verdict

PASS

## Contract Drift Findings

Fixed:

- `packages/types/src/api/dive-passport.ts` advertised `PassportMapPreview.markers` as full `ProfileDiveMapMarker[]`.
- The backend Passport DTO returns compact `PassportMapMarker` objects without proof IDs, coordinates, visibility, unlock timestamps, or last-proof fields.
- `packages/types/src/api/dive-passport.ts` advertised `PassportJourneyHighlights.entries` as full `JourneyEntry[]`.
- The backend Passport DTO returns compact Journey highlight entries without user ID, source identifiers, state, media IDs, or created/updated timestamps.

No hard-stop was required because the correct fix was to tighten the shared Passport aggregate contract to the existing backend read model. This preserves ownership boundaries instead of expanding Passport into a child-system DTO mirror.

## Scope Completed

- Compared Passport backend DTOs with shared TypeScript contracts.
- Verified Dive Map, Journey, Badges, and Passport web clients import shared contracts rather than defining local cross-boundary DTOs.
- Verified `apps/web/src/features/profile/types.ts` only re-exports shared profile types plus a local presentation-only `ProfilePost` shape.
- Added explicit compact shared Passport preview types.
- Added a shared contract test for compact read-only Passport child previews.

## Files Changed

- `packages/types/src/api/dive-passport.ts`
- `packages/types/test/dive-passport-contracts.test.ts`
- `.ai/initiatives/profile-experience-integration/phases/phase-8-api-dto-consistency-and-shared-contracts-audit.md`
- `.ai/initiatives/profile-experience-integration/reports/phase-8-api-dto-consistency-and-shared-contracts-audit.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Type/Test Evidence

Passed:

- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`
  - Result: 40 tests passed.
- `pnpm --filter @freediving.ph/web type-check`
- `TEST_DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' go test ./internal/features/profiles/...`
- `TEST_DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' go test ./internal/app/...`
- `git diff --check`

## Route Snapshot Evidence

- Routes were already wired for `profileDiveMap`, `profileJourney`, `profilePassport`, and `myPassportSettings`.
- No route snapshot update was needed in Phase 8.

## Repairs Attempted

One contract repair:

- Tightened Passport shared DTOs from full child records to compact aggregate preview records.

## Remaining Contract Risks

- Passport preview DTOs intentionally omit full child fields. Web code that needs full Dive Map markers or full Journey entries must call those source endpoints directly.
- Future backend Passport DTO changes must update `packages/types` first; ad hoc web adapters would reintroduce drift.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Next Phase Readiness

Ready for Phase 9: Gap Report And Follow-Up Initiative Recommendations.
