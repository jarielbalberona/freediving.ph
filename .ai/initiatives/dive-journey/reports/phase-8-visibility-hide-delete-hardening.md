# Phase 8 Report: Visibility/Hide/Delete Hardening

## Final Status

passed

## Summary of Changes

- Hardened Journey visibility and hide/delete behavior with targeted backend, shared contract, and web tests.
- Added generated-entry hide/archive support scoped by owner, entry type, `source_type`, and `source_id`.
- Confirmed hidden generated rows are excluded from profile Journey reads.
- Confirmed manual delete remains owner-scoped and soft-deletes only active manual custom entries.
- Strengthened web static coverage so delete UI remains custom-entry-only and Journey copy does not imply proof, credentials, badges, or Passport authority.

## Files Changed

- `.ai/initiatives/dive-journey/phases/phase-8-visibility-hide-delete-hardening.md`
- `.ai/initiatives/dive-journey/reports/phase-8-visibility-hide-delete-hardening.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `services/fphgo/internal/features/dive_journey/repo/queries/journey.sql`
- `services/fphgo/internal/features/dive_journey/repo/sqlc/journey.sql.go`
- `services/fphgo/internal/features/dive_journey/repo/repo.go`
- `services/fphgo/internal/features/dive_journey/repo/repo_integration_test.go`
- `services/fphgo/internal/features/dive_journey/service/service.go`
- `services/fphgo/internal/features/dive_journey/service/service_test.go`
- `packages/types/test/dive-journey-contracts.test.ts`
- `apps/web/test/profile-journey-contract.test.mjs`

## Verification Commands and Results

- `cd services/fphgo && make sqlc`: passed.
- `cd services/fphgo && TEST_DB_DSN=postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable go test ./internal/features/dive_journey/...`: passed.
- `pnpm --filter @freediving.ph/types test`: passed, 37 tests.
- `pnpm --filter @freediving.ph/web test`: passed, 205 tests, 14 skipped.
- `git diff --check`: passed.

## Repairs Attempted

- None after implementation. All Phase 8 verification commands passed on first run.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Risks and Limitations

- Generated hide/archive is an internal service/repository integration point; no public generated-entry route was added.
- Tagged-user Journey behavior remains deferred because no locked privacy/tagging specification exists.
- Web Journey UI still exposes create/delete only; manual edit UI and media attachment picker remain future UI hardening.

## Next Phase Readiness

Ready for Phase 9: Passport Integration Preparation.
