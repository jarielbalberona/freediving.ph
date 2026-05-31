# Phase 3 Report: Memory CRUD APIs And Authorization

## Status

passed

## Summary

Phase 3 added authenticated Dive Memory CRUD and safe read APIs. Public profile reads filter through the repository owner context using existing `saved_users` follower semantics, accepted tag status for `tagged` visibility, deleted-state filtering, and `user_blocks` blocking checks. Member writes are owner-scoped through the authenticated actor.

No Map/Journey/Passport/Profile Badges integration was added. No web UI was added. No tag-management API was added. No memory write path mutates `user_dive_sites`.

## Files Changed

- `services/fphgo/internal/features/dive_memories/repo/queries/memories.sql`
- `services/fphgo/internal/features/dive_memories/repo/repo.go`
- `services/fphgo/internal/features/dive_memories/repo/sqlc/*`
- `services/fphgo/internal/features/dive_memories/service/service.go`
- `services/fphgo/internal/features/dive_memories/service/service_test.go`
- `services/fphgo/internal/features/dive_memories/http/dto.go`
- `services/fphgo/internal/features/dive_memories/http/handlers.go`
- `services/fphgo/internal/features/dive_memories/http/routes.go`
- `services/fphgo/internal/features/dive_memories/http/routes_test.go`
- `services/fphgo/internal/app/app.go`
- `services/fphgo/internal/app/routes.go`
- `services/fphgo/internal/app/routes_snapshot_test.go`
- `services/fphgo/internal/app/testdata/route_surface.snapshot.json`
- `.ai/initiatives/dive-memories/phases/phase-3-memory-crud-apis-and-authorization.md`
- `.ai/initiatives/dive-memories/phases/phase-4-media-attachment-support.md`
- `.ai/initiatives/dive-memories/reports/phase-3-memory-crud-apis-and-authorization.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Implementation Evidence

- Added public route: `GET /v1/profiles/{username}/dive-memories`.
- Added member routes:
  - `GET /v1/me/dive-memories`
  - `POST /v1/me/dive-memories`
  - `PATCH /v1/me/dive-memories/{memoryID}`
  - `DELETE /v1/me/dive-memories/{memoryID}`
- Added service validation for required `diveSiteId`, title/body length, UUIDs, occurrence time defaulting, and `public`/`followers`/`tagged`/`private` visibility.
- Added owner-scoped create/update/delete behavior.
- Added profile-visible repository reads that support:
  - public memories,
  - self-visible private/followers/tagged memories,
  - follower-visible memories through `saved_users`,
  - accepted-tag memories through `dive_memory_tagged_users`,
  - blocking through `user_blocks`.

## Verification Results

### Verification Summary

- Commands run: 5
- Passed: 4
- Failed then repaired: 1
- Skipped: 0

### Exact Commands Run

- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" TEST_DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' go test ./internal/features/dive_memories/...`
  - Initial result: failed because a service test incorrectly expected a wrapped repository not-found cause to disappear.
  - Repair: corrected the test to assert the service operation fails, while preserving wrapped error semantics.
- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" gofmt -w internal/features/dive_memories/service/service_test.go && TEST_DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' go test ./internal/features/dive_memories/...`
  - Result: pass
  - Evidence: `ok fphgo/internal/features/dive_memories/http`, `ok fphgo/internal/features/dive_memories/repo`, `ok fphgo/internal/features/dive_memories/service`.
- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" go test ./internal/app/...`
  - Initial result: failed because the route snapshot intentionally gained five Dive Memories routes.
- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" UPDATE_SNAPSHOTS=1 go test ./internal/app/ -run TestRouteSurfaceSnapshot`
  - Result: pass
  - Evidence: route snapshot updated.
- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" go test ./internal/app/...`
  - Result: pass
  - Evidence: `ok fphgo/internal/app 0.735s`.
- `git diff --check`
  - Result: pass

## Source-Of-Truth Boundary Evidence

- Service and HTTP code do not call Dive Map, Journey, Passport, Profile Badges, or media derivation paths.
- The only ownership mutation is `dive_memories.deleted_at` for soft delete and `dive_memories` rows for owner CRUD.
- Repository profile reads consult `user_blocks`, `saved_users`, and `dive_memory_tagged_users`; they do not derive map proof or visited-site counts.

## Unrelated Drift Classification

- Pre-existing dirty files remain outside this phase and were not reverted.
- Shell PATH drift remains an environment issue; verification used explicit PATH values.

## Risks And Limitations

- active: Media attachment authorization is not complete until Phase 4.
- active: Tagged-user management APIs and blocked-user tag prevention are not complete until Phase 5.
- active: Public profile memory reads currently only expose profile-authored memories; map marker tagged/shared memory display is deferred to Phase 7.

## Next Phase Readiness

Ready for Phase 4 Media Attachment Support.
