# Phase 8: Integration With Badges/Dive Map/Journey

Status: pending

## Objective

Wire available source-system reads into Passport while preserving one-way dependency direction.

## Goal

Wire available Profile Badges, Dive Map, and Dive Journey read surfaces into the Passport aggregate without mutating those systems.

## Scope

- Passport aggregate service integration code.
- Tests around child read integration.
- Minimal adapters if needed to keep handlers thin and source boundaries clear.

## Out Of Scope

- No Dive Map implementation.
- No Dive Journey implementation.
- No badge verification or awarding.
- No certification authority behavior.
- No source-data duplication.

## Non-Goals

- Do not add reverse dependencies from Map, Journey, or Badges to Passport.
- Do not mutate child systems.
- Do not backfill missing child systems.

## Dependencies

- Phase 1 dependency findings.
- Completed aggregate API and shared contracts.
- Existing Profile Badges, Dive Map, and Dive Journey read surfaces if available.

## Tasks

- Integrate Profile Badges read data when available.
- Integrate Dive Map preview read data when available.
- Integrate Dive Journey highlights read data when available.
- Preserve fallback behavior when any child system is absent.
- Add tests proving each integration is read-only.
- Add tests proving Passport does not mutate locations, visited counts, Journey entries, or badges.

## Verification Requirements

- Tests must prove Profile Badges, Dive Map, and Dive Journey integrations are read-only.
- Tests must prove stable fallback when any child system is absent.
- Diff review must show no child-system implementation beyond narrow read integration fixes.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_passport/...` if a Passport package exists.
- `cd services/fphgo && go test ./internal/features/profiles/...` if profile paths are touched.
- `pnpm --filter @freediving.ph/types type-check`
- `git diff --check`

## Expected Evidence

- Available child systems appear in Passport aggregate.
- Missing child systems return stable fallbacks.
- Tests prove read-only boundaries.
- No child-system implementation files are added except narrow read integration fixes if required.

## Repair Policy

Allowed repairs:

- read adapter corrections.
- service test corrections.
- contract shape corrections.
- formatting issues.

Hard-stop if child contracts are unavailable/contradictory, integration requires mutating a child system, or source data would need to be copied into Passport storage.

## Stop Conditions

- Child contracts are unavailable or contradictory.
- Integration requires child writes.
- Source data would need to be copied into Passport storage.

## Expected Report Output

- Child systems integrated or skipped with fallback reason.
- Read-only integration evidence.
- Tests proving no Map/Journey/Badge mutation.
- Confirmation no reverse dependency was introduced.

## Completion Notes

Filled by the execution skill or runner.
