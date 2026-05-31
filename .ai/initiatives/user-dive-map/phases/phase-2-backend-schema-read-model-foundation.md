# Phase 2: Backend Schema/Read Model Foundation

Status: pending

## Objective

Create the persistence foundation for proof-based unlocked dive sites without touching runtime feature behavior.

## Goal

Add non-destructive database support for media proof tagging and the `user_dive_sites` read model.

## Scope

- `services/fphgo/db/migrations`
- `services/fphgo/db/schema/000_schema.sql`
- `services/fphgo/db/*test.go`
- `services/fphgo/sqlc.yaml` if a new query package is needed
- Feature repository query files for the selected backend boundary

## Out Of Scope

- No web changes.
- No Dive Memories tables unless Phase 1 confirms they are V1 and the schema work is explicitly needed now.
- No badge, Dive Journey, or Dive Passport implementation.
- No destructive migration.

## Non-Goals

- Do not implement derivation logic.
- Do not add read APIs.
- Do not backfill by guessing historical visits from memories or unrelated tables.

## Inputs

- Phase 1 report.
- `01-domain-model.md`
- `02-module-sequence.md`
- Existing schema and migration conventions.

## Tasks

- Add or validate `media_posts.dive_site_id` using a non-destructive migration.
- Add `user_dive_sites` with fields defined in `01-domain-model.md`.
- Add primary/unique constraints and indexes for `(user_id, dive_site_id)`, `dive_site_id`, and read paths identified in Phase 1.
- Add foreign keys consistent with existing schema rules.
- Add visibility field using existing enum or pattern where available.
- Update schema snapshot if that is the existing convention.
- Add or adjust migration/schema drift tests.
- Add sqlc query package configuration only if needed by later phases.

## Implementation Notes

- `user_dive_sites` is a derived read model, not an editable user preference table.
- Constraints should make duplicate `(user_id, dive_site_id)` rows impossible.
- Visibility must follow existing enum/model conventions; do not invent a parallel visibility system.

## Verification Requirements

- Migration/schema checks must prove the change is additive and reproducible.
- sqlc generation must be clean if sqlc configuration or queries change.

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
- `user_dive_sites` constraints prevent duplicate user/site rows.
- No app/frontend/shared package code changed in this phase.

## Repair Policy

Allowed repairs:

- migration syntax failures
- schema snapshot drift
- sqlc configuration errors
- missing indexes or constraints inside this phase scope
- formatting issues

Hard-stop for destructive migration, ambiguous target dive site table, ambiguous media ownership field, or unresolved visibility enum/model conflict.

## Stop Conditions

- Any migration would delete or reinterpret existing data.
- The target dive-site table is unclear.
- `media_posts.dive_site_id` cannot be added or validated safely.
- Existing visibility model cannot represent `user_dive_sites.visibility`.

## Expected Report Output

- Migration files changed.
- Schema snapshot changes.
- sqlc changes, if any.
- Verification command evidence.
- Explicit statement that no application runtime behavior was implemented.

## Completion Notes

Filled by the execution skill or runner.
