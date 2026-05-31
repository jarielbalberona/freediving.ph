# Phase 2: Backend Schema Foundation

Final status: passed

## Summary

Added non-destructive Dive Journey schema foundation and sqlc package setup. No API, service, frontend, badge, map, passport, notification, or generated-entry producer behavior was implemented.

## Files Changed

- `services/fphgo/db/migrations/0085_dive_journey.sql`
- `services/fphgo/db/schema/000_schema.sql`
- `services/fphgo/sqlc.yaml`
- `services/fphgo/internal/features/dive_journey/repo/queries/journey.sql`
- `services/fphgo/internal/features/dive_journey/repo/sqlc/db.go`
- `services/fphgo/internal/features/dive_journey/repo/sqlc/journey.sql.go`
- `services/fphgo/internal/features/dive_journey/repo/sqlc/models.go`

## Implementation Summary

- Added `journey_entries` with owner, type, title/body, optional `dive_site_id`, optional `source_type/source_id`, optional cover media, visibility, state, occurrence time, hide/delete timestamps, and audit timestamps.
- Added `journey_entry_media` for ordered attachments to existing `media_objects`.
- Added visibility support for `public`, `followers`, and `private`.
- Added generated-entry idempotency via `idx_journey_entries_generated_source`.
- Added cursor/read indexes for owner timelines, public timelines, visibility-filtered timelines, dive-site context, and media sort order.
- Added a minimal sqlc query package boundary for later phases.
- Did not add `journey_entry_tagged_users`; Phase 1 did not confirm safe tagged-user privacy/acceptance semantics.

## Verification Commands And Results

- `cd services/fphgo && go test ./db/...`: passed.
- `DB_DSN=postgres://postgres:postgres@localhost:5433/fph?sslmode=disable pnpm migrate:go`: passed; migrated to version 85.
- `DB_DSN=postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable pnpm migrate:go`: passed; migrated to version 85.
- `cd services/fphgo && make sqlc`: passed.
- `pnpm sqlc:go`: passed.
- `git diff -- services/fphgo/db/migrations services/fphgo/db/schema/000_schema.sql services/fphgo/sqlc.yaml services/fphgo/internal/features/dive_journey/repo/queries services/fphgo/internal/features/dive_journey/repo/sqlc`: reviewed.
- `git diff --check`: passed.

## Repairs Attempted

None.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

`.ai/state/decisions.md` was not updated because no new durable project decision was made.

## Risks And Limitations

- Tagged-user Journey persistence remains deferred pending a safe privacy/acceptance model.
- `source_type/source_id` idempotency is ready, but generated producers are not implemented in this phase.
- Media attachments point at existing media objects; later service code must verify ownership/authorization before inserting attachment rows.

## Next Phase Readiness

Ready for Phase 3: Journey Read/Write APIs And Authorization.
