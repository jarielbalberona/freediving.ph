# Phase 5 Report: Tagged-User Policy And APIs

## Status

passed

## Summary

Phase 5 added tagged-user lifecycle APIs and service policy for Dive Memories. Tags default to `pending`, accepted/declined/hidden transitions are actor-scoped to the tagged user, blocked users cannot be tagged or use tag access, and pending tags are exposed only through the authenticated tagged-user management read.

No notifications, realtime behavior, mobile UI, map integration, Journey integration, Passport integration, badge behavior, or public presentation of pending participation was added.

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
- `services/fphgo/internal/app/routes.go`
- `services/fphgo/internal/app/testdata/route_surface.snapshot.json`
- `.ai/initiatives/dive-memories/phases/phase-5-tagged-user-policy-and-apis.md`
- `.ai/initiatives/dive-memories/phases/phase-6-shared-typescript-contracts.md`
- `.ai/initiatives/dive-memories/reports/phase-5-tagged-user-policy-and-apis.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Implementation Evidence

- Added author-managed tag routes:
  - `POST /v1/me/dive-memories/{memoryID}/tags`
  - `DELETE /v1/me/dive-memories/{memoryID}/tags/{taggedUserID}`
- Added tagged-user management routes:
  - `GET /v1/me/dive-memory-tags`
  - `PATCH /v1/me/dive-memory-tags/{memoryID}`
- Added service checks that only the memory author can add/remove tags.
- Added service checks that bidirectional `user_blocks` prevents tag creation and tag access.
- Added accepted/declined/hidden status transitions for the tagged user.
- Added management reads for the tagged user with optional status filtering.

## Verification Results

### Verification Summary

- Commands run: 5
- Passed: 4
- Failed then repaired: 1
- Skipped: 0

### Exact Commands Run

- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" TEST_DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' go test ./internal/features/dive_memories/...`
  - Result: pass
  - Evidence: Dive Memories HTTP/repo/service tests passed.
- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" go test ./internal/features/profiles/...`
  - Result: pass
  - Evidence: profile HTTP/repo/service tests passed.
- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" go test ./internal/app/...`
  - Initial result: failed because route snapshot intentionally gained four tag-management routes.
- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" UPDATE_SNAPSHOTS=1 go test ./internal/app/ -run TestRouteSurfaceSnapshot && go test ./internal/app/...`
  - Result: pass
  - Evidence: route snapshot updated and app route tests passed.
- `git diff --check`
  - Result: pass

## Source-Of-Truth Boundary Evidence

- Tag add/remove/status updates write only `dive_memory_tagged_users`.
- Blocking checks read `user_blocks`; they do not create or infer ownership.
- Accepted tags are required for tagged visibility; pending tags remain management-only.
- No code added in Phase 5 writes `user_dive_sites`, Journey, Passport, Profile Badges, or media proof state.

## Risks And Limitations

- active: Shared TypeScript contracts are not added until Phase 6.
- active: Map marker, Journey, and Passport presentation integration remain later phases and must preserve the non-proof boundary.

## Next Phase Readiness

Ready for Phase 6 Shared TypeScript Contracts.
