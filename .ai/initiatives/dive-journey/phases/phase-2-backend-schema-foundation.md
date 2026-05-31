# Phase 2: Backend Schema Foundation

Status: passed

## Objective

Create additive persistence for Journey timeline entries without making Journey a source of truth for other domains.

## Goal

Add non-destructive database support for Journey entries, media attachments, and tagged users where V1 scope allows.

## Scope

- `services/fphgo/db/migrations`
- `services/fphgo/db/schema/000_schema.sql`
- `services/fphgo/db/*test.go`
- `services/fphgo/sqlc.yaml` if a new query package is needed
- Feature repository query files for the selected Journey backend boundary

## Out Of Scope

- No web changes.
- No Dive Map, Badge, Passport, certification, event, or course implementation.
- No notifications.
- No destructive migration.

## Non-Goals

- Do not create Dive Map ownership from Journey rows.
- Do not create badge/certification source data.
- Do not implement generated-entry producers.

## Dependencies

- Phase 1 report.
- `01-domain-model.md`
- Existing schema and migration conventions.

## Tasks

- Add `journey_entries` with fields defined in `01-domain-model.md`.
- Add `journey_entry_media` if media attachments are confirmed V1.
- Add `journey_entry_tagged_users` if tagged-user support is confirmed V1.
- Add idempotency constraints or indexes for generated entries using `source_type` and `source_id` where appropriate.
- Add ownership, visibility, occurrence-time, and read-path indexes.
- Add foreign keys consistent with existing schema rules.
- Update schema snapshot if that is the existing convention.
- Add or adjust migration/schema drift tests.
- Add sqlc query package configuration only if needed by later phases.

## Verification Requirements

- Migration must be additive and non-destructive.
- Schema must support `source_type` and `source_id` for idempotency.
- Visibility must support `public`, `followers`, and `private`, or execution must stop with a documented product fallback decision.

## Verification Commands

- `cd services/fphgo && go test ./db/...`
- `cd services/fphgo && make sqlc`
- `pnpm sqlc:go`
- `git diff -- services/fphgo/db/migrations services/fphgo/db/schema/000_schema.sql services/fphgo/sqlc.yaml`
- `git diff --check`

## Expected Evidence

- Goose migration exists and is non-destructive.
- Schema drift tests pass or the report records exact local environment blockers.
- sqlc generation succeeds.
- Generated-entry idempotency support exists where planned.
- No frontend/shared package code changed in this phase.

## Repair Policy

Allowed repairs:

- migration syntax failures
- schema snapshot drift
- sqlc configuration errors
- missing indexes or constraints inside this phase scope
- formatting issues

Hard-stop for destructive migration, unresolved visibility representation, ambiguous generated-entry uniqueness, or unclear target user/profile table.

## Stop Conditions

- Destructive migration risk.
- Missing or ambiguous visibility representation.
- Generated-entry idempotency cannot be modeled safely.
- Target user/profile table is unclear.

## Expected Report Output

- Migration/schema/sqlc files changed.
- Visibility and idempotency model chosen.
- Verification evidence.
- Confirmation no runtime feature behavior was implemented beyond schema/query foundation.

## Completion Notes

Completed on 2026-05-31.

- Added additive Journey persistence in migration `0085_dive_journey.sql`.
- Added `journey_entries` and `journey_entry_media`.
- Deferred `journey_entry_tagged_users` because Phase 1 found no reusable tagged-user acceptance/privacy model.
- Added generated-entry idempotency through a partial unique index on `(user_id, source_type, source_id, type)`.
- Added sqlc package foundation for `services/fphgo/internal/features/dive_journey`.
