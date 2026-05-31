# Phase 6: Map Read Model Hardening

Final status: passed

## Summary

Hardened proof/read-model enforcement with focused repository contract coverage.

The added test fails if profile Dive Map reads stop requiring `user_dive_sites`, return proof media outside the target user's own posts, return media from another dive site, include non-active/non-ready/non-approved media, or read Dive Memories.

## Changes

- Updated `services/fphgo/internal/features/profiles/repo/badges_contract_test.go` with Dive Map read enforcement checks.
- No product behavior or new UI/API surface was added in this hardening phase.

## Verification Commands And Results

- `cd services/fphgo && go test ./internal/features/media/...`: passed.
- `cd services/fphgo && go test ./internal/features/profiles/...`: passed.
- `cd services/fphgo && TEST_DB_DSN=postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable go test ./internal/features/dive_map/...`: passed.
- `pnpm --filter @freediving.ph/types test`: passed, 34 tests.
- `git diff --check`: passed.

## Risks And Limitations

- Phase 6 added static contract enforcement in profile repository tests plus existing Postgres-backed derivation coverage. A future broader integration suite could add end-to-end HTTP tests against seeded `user_dive_sites`, but that would be beyond this phase's narrow hardening scope.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

`.ai/state/decisions.md` was not updated because no new durable product decision was made.

## Next Phase Readiness

Ready for Phase 7: Profile UI Hardening.
