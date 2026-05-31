# Phase 6: Journey + Passport Integration Hardening

Status: passed

## Objective

Ensure Passport can consume Journey highlights without mutating Journey or turning Journey into Passport stats.

## Goal

Harden Journey-to-Passport read integration and fallback behavior.

## Scope

- Dive Journey read services/contracts.
- Dive Passport aggregate services/contracts.
- Tests for read-only Passport access.
- Web profile/Passport rendering checks where applicable.

## Out Of Scope

- No Passport stats aggregation from Journey.
- No Journey entry creation by Passport.
- No new Journey product features.
- No Passport PDF/export/mobile work.

## Non-Goals

- Do not make Passport a Journey producer.
- Do not treat Journey highlights as verified stats.
- Do not duplicate Journey rows into Passport storage.

## Dependencies

- Phase 2 and Phase 3 reports.
- Implemented Journey and Passport modules if available.
- Locked Dive Journey and Dive Passport specs.

## Tasks

- Verify Passport reads Journey highlights only.
- Verify Passport handles empty Journey.
- Add tests proving Passport does not create/mutate Journey entries.
- Verify Journey visibility is applied before Passport display.
- Verify Passport empty-state contracts match web behavior.

## Verification Requirements

- Tests must prove Passport is read-only against Journey.
- Tests must prove private Journey entries do not leak through Passport.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_journey/...` if a Journey package exists.
- `cd services/fphgo && go test ./internal/features/dive_passport/...` if a Passport package exists.
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web test`
- `git diff --check`

## Expected Evidence

- Journey/Passport read-only tests.
- Empty Journey fallback tests.
- Visibility evidence.

## Repair Policy

Allowed repairs:

- read integration corrections.
- visibility filter corrections.
- contract empty-state fixes.
- formatting issues.

Hard-stop if Passport requires Journey writes, Journey visibility is ambiguous, or Passport duplicates Journey source data.

## Stop Conditions

- Passport cannot read Journey without mutating it.
- Journey visibility rules are unclear.
- Empty-state contract is insufficient.

## Expected Report Output

- Journey/Passport integration status.
- Read-only evidence.
- Visibility and empty-state evidence.

## Completion Notes

Completed on 2026-05-31.

- Passport reads Journey through the `JourneyReader` interface only.
- Passport forwards viewer identity to `ListProfileJourney`, preserving Journey visibility filtering.
- Passport aggregate tests prove it does not create Journey entries or acquire generated-entry mutation dependencies.
- Empty/unavailable Journey states remain explicit in the Passport aggregate contract and UI-facing shared types.
