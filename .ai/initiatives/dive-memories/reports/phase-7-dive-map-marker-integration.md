# Phase 7 Report: Dive Map Marker Integration

## Status

passed

## Summary

Phase 7 integrated visible eligible Dive Memories into proof-backed Dive Map marker detail reads. The marker itself still exists only through `user_dive_sites`; memory previews are downstream detail content and cannot unlock markers, inflate counts, or alter first/last proof fields.

## Files Changed

- `services/fphgo/internal/features/profiles/repo/repo.go`
- `services/fphgo/internal/features/profiles/repo/repo_integration_test.go`
- `services/fphgo/internal/features/profiles/repo/badges_contract_test.go`
- `services/fphgo/internal/features/profiles/service/service.go`
- `services/fphgo/internal/features/profiles/http/dto.go`
- `services/fphgo/internal/features/profiles/http/handlers.go`
- `services/fphgo/internal/features/profiles/http/integration_test.go`
- `packages/types/src/api/profile-view.ts`
- `packages/types/test/profile-contracts.test.ts`
- `apps/web/src/features/profile/components/ProfileDiveMap.tsx`
- `.ai/initiatives/dive-memories/phases/phase-7-dive-map-marker-integration.md`
- `.ai/initiatives/dive-memories/phases/phase-8-dive-journey-and-passport-integration.md`
- `.ai/initiatives/dive-memories/reports/phase-7-dive-map-marker-integration.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Implementation Evidence

- Added `memories` to `ProfileDiveMapSiteResponse`.
- Marker memory reads require an existing `user_dive_sites` row for the marker owner and matching `dive_site_id`.
- Author marker memory previews include eligible author-owned memories for the unlocked site.
- Tagged/shared marker memory previews require the marker owner to be an accepted tagged user for the memory and to have unlocked the same site.
- Memory visibility still filters through public/followers/tagged/private logic and block checks.
- Web marker detail displays compact memory previews without changing proof count copy.

## Verification Results

### Verification Summary

- Commands run: 6
- Passed: 5
- Failed then repaired: 1
- Skipped: 0

### Exact Commands Run

- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" TEST_DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' go test ./internal/features/profiles/...`
  - Initial result: failed because an old static contract still said profile Dive Map V1 must not read Dive Memories at all.
  - Repair: updated the contract to the new locked rule: marker detail may read memories only after `user_dive_sites` gating, while visited-site counters still must not count memories.
- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" TEST_DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' go test ./internal/features/profiles/...`
  - Result: pass
  - Evidence: profile HTTP/repo/service tests passed.
- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" TEST_DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' go test ./internal/features/dive_map/...`
  - Result: pass
  - Evidence: Dive Map repo tests passed.
- `PATH="/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" TEST_DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' go test ./internal/features/dive_memories/...`
  - Result: pass
  - Evidence: Dive Memories HTTP/repo/service tests passed.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" pnpm --filter @freediving.ph/types type-check`
  - Result: pass
  - Evidence: `tsc --noEmit` completed.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" pnpm --filter @freediving.ph/web type-check`
  - Result: pass
  - Evidence: `tsc --noEmit` completed.
- `git diff --check`
  - Result: pass

## Source-Of-Truth Boundary Evidence

- `GetProfileDiveMapByUsername` still derives marker list and `visitedSiteCount` from `user_dive_sites`.
- `GetProfileDiveMapSiteByUsername` loads memory previews only after the marker query succeeds.
- Memory previews do not affect `mediaPostCount`, `firstPostId`, `lastPostId`, `firstVisitedAt`, `lastVisitedAt`, `unlockedAt`, or `visitedSiteCount`.

## Risks And Limitations

- active: Journey and Passport integration remain Phase 8 work.
- accepted: Web marker memory display is compact preview-only; deeper memory management UI remains Phase 9.

## Next Phase Readiness

Ready for Phase 8 Dive Journey And Passport Integration.
