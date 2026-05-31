# Phase 8: Badge/Journey/Passport Integration Preparation

Final status: passed

## Summary

Prepared the minimal read-model boundary for future Profile Badges, Dive Journey, and Dive Passport consumption without implementing those downstream products.

## Changes

- Added `services/fphgo/internal/features/dive_map/README.md`.
- The README documents:
  - `user_dive_sites` as V1 source of truth for visited dive sites.
  - `RecomputeUserDiveSite` as the media derivation entrypoint.
  - profile Dive Map read methods as profile-facing marker reads.
  - profile visited-site count methods as the current count integration point.
  - Dive Memories/tagged-user sharing as deferred pending a separate locked initiative.

## Verification Commands And Results

- `cd services/fphgo && go test ./internal/features/profiles/...`: passed.
- `cd services/fphgo && TEST_DB_DSN=postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable go test ./internal/features/dive_map/...`: passed.
- `cd services/fphgo && go test ./internal/features/media/...`: passed.
- `pnpm --filter @freediving.ph/types type-check`: passed.
- `git diff --check`: passed.

## Confirmation

- No badge awarding was implemented.
- No badge definitions were added.
- No Dive Journey timeline behavior was implemented.
- No Dive Passport aggregation was implemented.
- No Dive Memories behavior or memory-driven hook was added.

## Follow-Up Recommendation

Create a separate locked `dive-memories` initiative before any memory content appears in map markers or downstream profile experience modules. That initiative must define tagged-user ownership, acceptance/decline, blocking, visibility, and authorization rules.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

`.ai/state/decisions.md` was not updated because no new durable product decision was made.

## Next Phase Readiness

Ready for Phase 9: Final Verification/Reporting.
