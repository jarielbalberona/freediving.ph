# Phase 4: Optional Passport Settings Schema/API

Status: pending

## Objective

Add owner-controlled presentation settings only if they cannot become source data or child visibility controls.

## Goal

Implement presentation-only Passport settings only if prior phases confirm product behavior is clear and low risk.

## Scope

- `services/fphgo/db/migrations`
- `services/fphgo/db/schema/000_schema.sql`
- `services/fphgo/sqlc.yaml`
- Passport settings repository/service/handler.
- Go tests for owner-only settings reads/writes.

## Out Of Scope

- No `dive_passports` source-of-truth table.
- No duplicated child source data.
- No source-system mutations.
- No web UI changes.
- No settings that change child visibility rules.

## Non-Goals

- Do not store copied badge/map/journey/memory/media data.
- Do not let settings modify source visibility.
- Do not implement featured badge behavior without product clarity.

## Dependencies

- Phase 1 settings decision.
- Phase 2 settings contract design.
- Existing migration/sqlc conventions.

## Tasks

- Hard-stop immediately if settings were not approved as low-risk in Phase 1/2.
- Add `passport_settings` only for presentation preferences.
- Add owner-only settings read/update API if in scope.
- Ensure settings can hide/order sections but cannot change source stats or child resource visibility.
- Add migration/schema/sqlc tests where settings schema is added.

## Verification Requirements

- Settings must be limited to `show_map`, `show_badges`, `show_journey`, `show_memories`, featured badge references/order, and timestamps unless Phase 2 explicitly approved more.
- Tests must prove settings mutate only presentation preferences.
- Migration/sqlc checks run only if settings schema is added.

## Verification Commands

- `cd services/fphgo && go test ./db/...`
- `cd services/fphgo && make sqlc`
- `pnpm sqlc:go`
- `cd services/fphgo && go test ./internal/features/dive_passport/...` if a Passport package exists.
- `cd services/fphgo && go test ./internal/app/...`
- `git diff -- services/fphgo/db/migrations services/fphgo/db/schema/000_schema.sql services/fphgo/sqlc.yaml`
- `git diff --check`

## Expected Evidence

- Settings table, if added, stores presentation preferences only.
- Tests prove owner-only settings writes.
- Tests prove settings do not mutate child data.
- No `dive_passports` table exists.

## Repair Policy

Allowed repairs:

- migration syntax failures.
- schema snapshot drift.
- sqlc generated drift.
- settings service/handler test failures inside this phase scope.
- formatting issues.

Hard-stop for product ambiguity around settings/featured badges, destructive migration risk, or any temptation to persist child aggregate source data.

## Stop Conditions

- Settings product behavior is unclear.
- Featured badge ordering requires duplicating badge records.
- Migration would be destructive.
- Any setting would mutate child source data or child visibility.

## Expected Report Output

- Settings implemented or explicitly skipped.
- Migration/sqlc evidence if implemented.
- Owner-only settings authorization evidence.
- Confirmation no `dive_passports` table exists.

## Completion Notes

Filled by the execution skill or runner.
