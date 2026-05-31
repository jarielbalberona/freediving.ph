# Phase 5 Report: Dive Map + Journey Integration Hardening

Date: 2026-05-31

## Verdict

PASS

## Scope Completed

- Verified Dive Map remains the proof-based location ownership source.
- Verified Journey generated entries support stable map-style source identifiers through `source_type` and `source_id`.
- Verified duplicate generated map milestone regeneration updates the existing Journey row instead of inserting duplicates.
- Verified Journey entries do not create map ownership or visited-site rows.

## Files Changed

- `.ai/initiatives/profile-experience-integration/phases/phase-5-dive-map-journey-integration-hardening.md`
- `.ai/initiatives/profile-experience-integration/reports/phase-5-dive-map-journey-integration-hardening.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Map Milestone Integration Status

- No map milestone product catalog or producer was added in this phase.
- Existing Journey generated-entry upsert behavior is ready for future map milestone producers.
- Future map milestone producers must derive source events from `user_dive_sites`, then write downstream display entries through Journey generated-entry APIs.

## Journey Idempotency Evidence

- `services/fphgo/internal/features/dive_journey/repo/repo_integration_test.go` verifies generated entries are idempotent by `(user_id, source_type, source_id, type)`.
- The integration test uses a map-compatible source identity such as `source_type='dive_map'` and `source_id='user_dive_site:<id>'`.

## Unlock-Rule Evidence

- Journey manual and generated entries were verified not to create `user_dive_sites` rows.
- Dive Map repository tests passed, confirming map derivation remains tied to qualifying proof records.
- Shared/tagged memories remain unavailable and deferred; no Journey path was introduced that could unlock locations through shared/tagged content.

## Verification

Passed:

- `TEST_DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' go test ./internal/features/dive_map/...`
  - Result: `ok fphgo/internal/features/dive_map/repo`; sqlc package has no tests.
- `TEST_DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' go test ./internal/features/dive_journey/...`
  - Result: Journey HTTP, repo, and service packages passed; sqlc package has no tests.
- `pnpm --filter @freediving.ph/types test`
  - Result: 39 tests passed.
- `git diff --check`

## Repairs Attempted

None.

## Risks And Limitations

- Actual map milestone producer behavior remains future work and must not invent product milestone rules during integration hardening.
- Dive Memories/tagged-user sharing remains deferred until a separate locked privacy/tagging specification exists.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Next Phase Readiness

Ready for Phase 6: Journey + Passport Integration Hardening.
