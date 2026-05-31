# Phase 3: Journey Read/Write APIs And Authorization

Final status: passed

## Summary

Implemented backend Dive Journey read/write API foundation for profile timeline reads and authenticated owner manual-entry management. Journey remains downstream; no map, badge, credential, Passport, generated-entry, media-attachment, tagged-user, or frontend behavior was implemented.

## Files Changed

- `services/fphgo/internal/app/app.go`
- `services/fphgo/internal/app/routes.go`
- `services/fphgo/internal/features/dive_journey/repo/queries/journey.sql`
- `services/fphgo/internal/features/dive_journey/repo/sqlc/journey.sql.go`
- `services/fphgo/internal/features/dive_journey/repo/repo.go`
- `services/fphgo/internal/features/dive_journey/repo/repo_integration_test.go`
- `services/fphgo/internal/features/dive_journey/service/service.go`
- `services/fphgo/internal/features/dive_journey/service/service_test.go`
- `services/fphgo/internal/features/dive_journey/http/dto.go`
- `services/fphgo/internal/features/dive_journey/http/handlers.go`
- `services/fphgo/internal/features/dive_journey/http/routes.go`
- `services/fphgo/internal/features/dive_journey/http/routes_test.go`

## Implementation Summary

- Added `GET /v1/profiles/{username}/journey` for profile Journey reads.
- Added authenticated manual-entry routes:
  - `POST /v1/me/journey`
  - `PATCH /v1/me/journey/{entryID}`
  - `DELETE /v1/me/journey/{entryID}`
- Read authorization uses target profile ownership, `saved_users` follower status, and `user_blocks`.
- Manual create/update accepts entries without `dive_site_id` and without media.
- Manual update/delete are owner-scoped by `user_id` and limited to active manual `custom` rows with no generated source.
- Delete uses soft state transition to `deleted`.
- No Journey write calls Dive Map derivation, badge mutation, credential verification, or Passport state.

## Verification Commands And Results

- `cd services/fphgo && TEST_DB_DSN=postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable go test ./internal/features/dive_journey/...`: failed once, then passed after a test-only constant repair.
- `cd services/fphgo && go test ./internal/features/profiles/...`: passed.
- `cd services/fphgo && go test ./internal/app/...`: passed.
- `cd services/fphgo && make sqlc`: passed.
- `git diff --check`: passed.

## Repairs Attempted

- Repair 1: fixed `dive_journey/http` tests that referenced constants from a different Go package test. No application behavior changed.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

`.ai/state/decisions.md` was not updated because no new durable project decision was made.

## Risks And Limitations

- Media attachments are not implemented yet; Phase 4 owns that.
- Tagged-user support remains deferred because no safe acceptance/privacy model exists.
- Generated-entry idempotency is schema-ready but no generated producers exist yet.

## Next Phase Readiness

Ready for Phase 4: Media And Tagging Support.
