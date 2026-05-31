# Phase 5: Dive Map + Journey Integration Hardening

Status: pending

## Objective

Ensure Dive Map can feed Journey milestones while Journey never creates map ownership.

## Goal

Harden map milestone to Journey generated-entry behavior and unlock-rule boundaries.

## Scope

- Dive Map service/read-model tests.
- Dive Journey generated-entry integration tests.
- Shared source identifiers for generated Journey entries.

## Out Of Scope

- No new map milestone product catalog.
- No Journey UI work.
- No Passport work.
- No badge awarding.

## Non-Goals

- Do not let Journey write `user_dive_sites`.
- Do not let shared/tagged memories unlock sites through Journey.
- Do not use Journey entries to compute visited counts.

## Dependencies

- Phase 2 report.
- Locked Dive Map and Journey specs.
- Implemented Dive Map/Journey modules if available.

## Tasks

- Verify map milestone source uses `user_dive_sites`.
- Verify Journey generated entries use `source_type`/`source_id`.
- Add tests for idempotent map milestone regeneration.
- Add tests proving Journey entries do not unlock locations.
- Add tests proving shared/tagged memories obey unlock rules.

## Verification Requirements

- Tests must prove duplicate map milestone events do not duplicate Journey entries.
- Tests must prove Journey cannot create map ownership.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_map/...` if a Dive Map package exists.
- `cd services/fphgo && go test ./internal/features/dive_journey/...` if a Journey package exists.
- `pnpm --filter @freediving.ph/types test`
- `git diff --check`

## Expected Evidence

- Map/Journey integration tests.
- Idempotency evidence.
- Unlock-rule evidence.

## Repair Policy

Allowed repairs:

- generated-entry idempotency fixes.
- unlock-rule test/fix inside owning service.
- source identifier contract corrections.
- formatting issues.

Hard-stop if Map or Journey modules are unavailable without safe fallback, or if milestone behavior requires undefined product rules.

## Stop Conditions

- Map milestone behavior is undefined.
- Journey source identifiers cannot prevent duplicates.
- Journey code path would mutate map ownership.

## Expected Report Output

- Map milestone integration status.
- Journey idempotency evidence.
- Unlock-rule evidence.
- Remaining product gaps.

## Completion Notes

Filled by the execution skill or runner.
