# Phase 8 Report: Dive Journey And Passport Integration

## Status

passed

## Summary

Phase 8 integrated Dive Memories into downstream Journey and Passport presentation paths without making either system authoritative for memory source data. Memory create/update/delete now refresh or hide generated Journey display rows. Passport now reads recent visible memories through the Dive Memories service and exposes them as a bounded read-only preview.

## Files Changed

- `services/fphgo/internal/app/app.go`
- `services/fphgo/internal/features/dive_memories/service/service.go`
- `services/fphgo/internal/features/dive_memories/service/service_test.go`
- `services/fphgo/internal/features/dive_passport/service/service.go`
- `services/fphgo/internal/features/dive_passport/service/service_test.go`
- `services/fphgo/internal/features/dive_passport/http/dto.go`
- `services/fphgo/internal/features/dive_passport/http/handlers.go`
- `services/fphgo/internal/features/dive_passport/http/routes_test.go`
- `packages/types/src/api/dive-passport.ts`
- `packages/types/test/dive-passport-contracts.test.ts`
- `apps/web/src/features/profile/components/ProfilePassport.tsx`
- `.ai/initiatives/dive-memories/phases/phase-8-dive-journey-and-passport-integration.md`
- `.ai/initiatives/dive-memories/phases/phase-9-web-ui-and-management-surfaces.md`
- `.ai/initiatives/dive-memories/reports/phase-8-dive-journey-and-passport-integration.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Implementation Evidence

- Dive Memories service accepts an optional Journey writer and upserts generated display entries with `sourceType=memory` and `type=memory`.
- Memory deletes hide the generated Journey display row using owner, source type, source id, and type.
- `tagged` and private memories map to private Journey display rows because Journey's current visibility model does not encode accepted-tag visibility. This prevents leaking tag-only memories through Journey.
- Passport receives a memory reader dependency and calls `ListProfileMemories` with username, viewer identity, and limit.
- Passport memory stats are derived only from visible memory preview items, not from map proof, badges, or Journey rows.
- Passport DTO/shared contract now exposes `memories.state` plus compact memory `items`.
- Web Passport renders compact memory titles from the aggregate contract.

## Verification Results

### Verification Summary

- Commands run: 5
- Passed: 5
- Failed then repaired: 0
- Skipped: 0

### Exact Commands Run

- `PATH="/Users/jariel/go/bin:/usr/local/go/bin:/opt/homebrew/bin:/usr/local/bin:$PATH" TEST_DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' go test ./internal/features/dive_memories/... ./internal/features/dive_journey/... ./internal/features/dive_passport/...`
  - Result: pass
  - Evidence: Dive Memories, Dive Journey, and Dive Passport Go tests passed.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" pnpm --filter @freediving.ph/types type-check`
  - Result: pass
  - Evidence: `tsc --noEmit` completed.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" pnpm --filter @freediving.ph/types test`
  - Result: pass
  - Evidence: 43 shared contract tests passed.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" pnpm --filter @freediving.ph/web type-check`
  - Result: pass
  - Evidence: `tsc --noEmit` completed.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" git diff --check`
  - Result: pass

## Source-Of-Truth Boundary Evidence

- Journey receives generated display entries only from memory writes and remains downstream.
- Passport reads memories through the memory-owned service and does not create, update, delete, or own memory source rows.
- No Phase 8 code writes `user_dive_sites`, awards badges, verifies credentials, or computes visited-site counts from memories.

## Risks And Limitations

- accepted: Journey cannot represent accepted-tag visibility directly. Tagged memories are therefore represented as private Journey display rows in V1 to avoid privacy leakage.
- active: Full web memory management and tagged-memory fallback remain Phase 9 work.

## Next Phase Readiness

Ready for Phase 9 Web UI And Management Surfaces.
