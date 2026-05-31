# Phase 2 Report: Backend Schema/Domain Foundation

## Status

passed

## Summary

Phase 2 added the backend persistence foundation for Dive Memories without adding HTTP routes, web UI, Journey/Passport/Map integration, or any write path to `user_dive_sites`.

The schema models Dive Memories as social/contextual records attached to dive sites. Memory creation can reference a site, media, and tagged users, but repository behavior does not unlock Dive Map ownership, inflate visited-site counts, award badges, or mutate downstream modules.

## Files Changed

- `services/fphgo/db/migrations/0087_dive_memories.sql`
- `services/fphgo/db/schema/000_schema.sql`
- `services/fphgo/sqlc.yaml`
- `services/fphgo/internal/features/dive_memories/repo/queries/memories.sql`
- `services/fphgo/internal/features/dive_memories/repo/repo.go`
- `services/fphgo/internal/features/dive_memories/repo/repo_integration_test.go`
- `services/fphgo/internal/features/dive_memories/repo/sqlc/*`
- `services/fphgo/internal/features/*/repo/sqlc/models.go`
- `.ai/initiatives/dive-memories/phases/phase-2-backend-schema-domain-foundation.md`
- `.ai/initiatives/dive-memories/phases/phase-3-memory-crud-apis-and-authorization.md`
- `.ai/initiatives/dive-memories/reports/phase-2-backend-schema-domain-foundation.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Implementation Evidence

- Added `dive_memories` with author, required `dive_site_id`, title/body, `public`/`followers`/`tagged`/`private` visibility, soft delete, and timestamps.
- Added `dive_memory_media` as an ordered join to existing `media_objects`.
- Added `dive_memory_tagged_users` with `pending`, `accepted`, `declined`, and `hidden` statuses.
- Added lookup indexes for author/site, site/visibility, deleted rows, memory media ordering, media lookup, and tag lookup.
- Added sqlc query package and repository methods for create, update, soft delete, own reads, map-gated reads, media replacement/listing, and tag upsert/status/listing.
- Added an integration test proving repository writes do not create `user_dive_sites` rows and map marker reads return no memories until the user already owns the site.

## Verification Results

### Verification Summary

- Commands run: 6
- Passed: 5
- Failed then repaired: 1
- Skipped: 0

### Exact Commands Run

- `DB_DSN='postgres://postgres:postgres@localhost:5433/fph?sslmode=disable' pnpm migrate:go`
  - Initial result: failed because the shell PATH later lost tool locations and the first attempt also hit transient DNS for `proxy.golang.org`, followed by `ENFILE`.
  - Repair: reran with explicit PATH.
- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" DB_DSN='postgres://postgres:postgres@localhost:5433/fph?sslmode=disable' pnpm migrate:go`
  - Result: pass
  - Evidence: `0087_dive_memories.sql` applied; database migrated to version 87.
- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' pnpm migrate:go`
  - Result: pass
  - Evidence: `0087_dive_memories.sql` applied; test database migrated to version 87.
- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" TEST_DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' go test ./db/...`
  - Result: pass
  - Evidence: `ok fphgo/db 39.415s`.
- `PATH="/Users/jariel/go/bin:/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" make sqlc`
  - Result: pass
  - Evidence: `sqlc generate` completed.
- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" TEST_DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' go test ./internal/features/dive_memories/...`
  - Result: pass
  - Evidence: `ok fphgo/internal/features/dive_memories/repo 0.816s`.
- `git diff --check`
  - Result: pass

## Unrelated Drift Classification

- Pre-existing dirty files remain outside this phase, including AI hardening files and unrelated web home-feed files. They were not reverted.
- The current shell PATH omitted `/usr/local/go/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, and `/Users/jariel/go/bin`; verification used explicit PATH values. This is an environment drift, not a repository code failure.

## Source-Of-Truth Boundary Evidence

- No Dive Memories repository method writes `user_dive_sites`.
- `ListForOwnedMapSite` gates marker memory reads through an existing `user_dive_sites` row.
- Repository tests verify memory create, update, tag, media, and soft delete do not create Dive Map ownership.
- The schema references `dive_sites` and `media_objects` only as contextual data; it does not establish proof semantics.

## Risks And Limitations

- active: Phase 2 does not yet implement HTTP authorization, visibility filtering, blocking, or tag acceptance APIs. Those remain Phase 3 and Phase 5 responsibilities.
- active: The local shell PATH drift can cause false-negative verification unless commands use explicit tool paths.

## Next Phase Readiness

Ready for Phase 3 Memory CRUD APIs And Authorization.
