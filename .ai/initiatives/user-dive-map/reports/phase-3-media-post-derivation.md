# Phase 3: Media Post To User Dive Sites Derivation

Final status: passed

## Summary

Implemented proof-based derivation for `user_dive_sites` from user-owned media posts tagged to an approved `dive_site_id`.

The derivation rule is deliberately narrow: a qualifying proof is a `media_posts` row owned by the user, tagged to the dive site, not deleted, attached to an approved dive site, and backed by at least one owned `media_items` row for the same post/site that is active, ready, approved, and not deleted. No Dive Memories, tagged users, comments, likes, feed items, or shared content participate.

## Changes

- Added deterministic recompute SQL to `services/fphgo/internal/features/dive_map/repo/queries/dive_map.sql`.
- Added `services/fphgo/internal/features/dive_map/repo/repo.go` with `RecomputeUserDiveSite`.
- Wired `services/fphgo/internal/app/app.go` to pass the Dive Map repository into the media service.
- Added `WithDiveMapDeriver` to `services/fphgo/internal/features/media/service/service.go`.
- Triggered recompute after successful profile media post creation.
- Triggered recompute after a tagged Moment becomes active/ready.
- Added media service tests for owner/site recompute hooks.
- Added a Postgres-backed dive_map repository integration test covering owner-only proof, another user's proof, multiple posts, soft-delete, retag, and untag recompute behavior.
- Regenerated sqlc output.

## Files Changed

- `.ai/initiatives/user-dive-map/phases/phase-3-media-post-derivation.md`
- `.ai/initiatives/user-dive-map/reports/phase-3-media-post-derivation.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `services/fphgo/internal/app/app.go`
- `services/fphgo/internal/features/dive_map/repo/queries/dive_map.sql`
- `services/fphgo/internal/features/dive_map/repo/repo.go`
- `services/fphgo/internal/features/dive_map/repo/repo_integration_test.go`
- `services/fphgo/internal/features/dive_map/repo/sqlc/dive_map.sql.go`
- `services/fphgo/internal/features/media/service/service.go`
- `services/fphgo/internal/features/media/service/service_test.go`

## Verification Commands And Results

- `export DB_DSN=postgres://postgres:postgres@localhost:5433/fph?sslmode=disable && pnpm migrate:go`: passed; migrated local database to version 84.
- `export DB_DSN=postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable && pnpm migrate:go`: passed; migrated local test database to version 84.
- `cd services/fphgo && go test ./internal/features/media/...`: passed.
- `cd services/fphgo && TEST_DB_DSN=postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable go test ./internal/features/dive_map/...`: passed.
- `cd services/fphgo && go test ./internal/app`: passed.
- `cd services/fphgo && make sqlc`: passed.
- `git diff --check`: passed.

## Repairs Attempted

- Fixed a sqlc generated field-name mismatch in the Dive Map repository wrapper.
- Fixed a Postgres parameter type issue in the integration test seed SQL.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

`.ai/state/decisions.md` was not updated because no new durable product decision was made.

## Risks And Limitations

- The repository has no existing media post edit/delete endpoint for profile feed posts. This phase did not invent new lifecycle endpoints; future edit/delete lifecycle work must call `RecomputeUserDiveSite` for the old and new `(user_id, dive_site_id)` pairs.
- Moment upload intent creation does not unlock a site. A tagged Moment only participates after it is marked active/ready/approved.
- `user_dive_sites` is now maintained for creation and ready Moment completion, but read APIs are still pending Phase 4.

## Next Phase Readiness

Ready for Phase 4: Dive Map Read APIs And Contracts.
