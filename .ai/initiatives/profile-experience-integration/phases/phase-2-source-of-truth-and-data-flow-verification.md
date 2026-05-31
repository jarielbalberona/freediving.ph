# Phase 2: Source-Of-Truth And Data-Flow Verification

Status: pending

## Objective

Prove the four profile modules have one-way source ownership and no duplicate source-of-truth models.

## Goal

Verify or harden data-flow invariants across Badges, Dive Map, Journey, and Passport.

## Scope

- Backend service/repository tests for source-of-truth invariants.
- Narrow code fixes only where current behavior violates locked ownership rules.
- Documentation/report updates for data-flow evidence.

## Out Of Scope

- No UI work.
- No broad refactors.
- No new product behavior.
- No duplicate tables or new persistence unless a later phase explicitly needs a non-destructive test fixture.

## Non-Goals

- Do not create source data for Passport.
- Do not make Journey authoritative.
- Do not make Badges authoritative for dive-site ownership.

## Dependencies

- Phase 1 report.
- Locked initiative rules.
- Current backend module boundaries.

## Tasks

- Add or identify tests proving `user_dive_sites` owns visited-site truth.
- Add or identify tests proving Passport is read-only.
- Add or identify tests proving Journey is downstream.
- Add or identify tests proving Badges do not create dive-site truth.
- Add or identify tests proving badge-origin Journey entries do not mutate badges and are duplicate-safe.
- Fix narrow violations inside the owning module only.

## Verification Requirements

- Tests must fail if source ownership is reversed or duplicated.
- Tests must fail if Journey awards, verifies, revokes, or mutates badges.
- Diff review must show no duplicate source-of-truth table.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/profiles/...`
- `cd services/fphgo && go test ./internal/features/dive_map/...` if a Dive Map package exists.
- `cd services/fphgo && go test ./internal/features/dive_journey/...` if a Journey package exists.
- `cd services/fphgo && go test ./internal/features/dive_passport/...` if a Passport package exists.
- `git diff --check`

## Expected Evidence

- Source-of-truth invariant tests.
- Badges -> Journey ownership/idempotency evidence.
- Any fixes scoped to owning modules.
- Report showing one-way data ownership.

## Repair Policy

Allowed repairs:

- narrow service/repository corrections inside the active source boundary.
- missing tests for documented invariants.
- formatting issues.

Hard-stop for source ownership ambiguity, required destructive migration, or behavior that requires rewriting locked module specs.

## Stop Conditions

- Source ownership cannot be determined.
- Existing behavior contradicts locked specs.
- Badge/Journey flow cannot be made read-only/idempotent without product input.
- Repair would require broad module rewrite.

## Expected Report Output

- Passed/failed invariant evidence.
- Source conflicts found.
- Badges -> Journey display-event evidence.
- Fixes made or blocker decisions needed.

## Completion Notes

Filled by the execution skill or runner.
