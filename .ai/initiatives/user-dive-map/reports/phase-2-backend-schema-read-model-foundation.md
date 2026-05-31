# Phase 2: Backend Schema/Read Model Foundation

Final status: passed

## Summary

Added the non-destructive persistence foundation for the proof-based User Dive Map.

`media_posts.dive_site_id` already existed and did not need alteration. Added `user_dive_sites` as the derived read model keyed by `(user_id, dive_site_id)`, with proof post references, first/last visit timestamps, media proof count, visibility, and read-path indexes.

No application runtime behavior was implemented in this phase.

## Changes

- Added Goose migration `services/fphgo/db/migrations/0084_user_dive_sites.sql`.
- Updated `services/fphgo/db/schema/000_schema.sql`.
- Added `services/fphgo/internal/features/dive_map/repo/queries/dive_map.sql`.
- Added `dive_map` sqlc configuration in `services/fphgo/sqlc.yaml`.
- Generated `services/fphgo/internal/features/dive_map/repo/sqlc/*`.
- Regenerated sqlc models in existing feature packages because the shared schema now includes `user_dive_sites`.

## Files Changed

- `.ai/initiatives/user-dive-map/phases/phase-2-backend-schema-read-model-foundation.md`
- `.ai/initiatives/user-dive-map/reports/phase-2-backend-schema-read-model-foundation.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `services/fphgo/db/migrations/0084_user_dive_sites.sql`
- `services/fphgo/db/schema/000_schema.sql`
- `services/fphgo/sqlc.yaml`
- `services/fphgo/internal/features/dive_map/repo/queries/dive_map.sql`
- `services/fphgo/internal/features/dive_map/repo/sqlc/db.go`
- `services/fphgo/internal/features/dive_map/repo/sqlc/dive_map.sql.go`
- `services/fphgo/internal/features/dive_map/repo/sqlc/models.go`
- `services/fphgo/internal/features/*/repo/sqlc/models.go` generated model updates from shared schema.

## Verification Commands And Results

- `cd services/fphgo && go test ./db/...`: passed (`ok fphgo/db`).
- `cd services/fphgo && make sqlc`: passed (`sqlc generate`).
- `pnpm sqlc:go`: passed (`cd services/fphgo && make sqlc`, `sqlc generate`).
- `git diff -- services/fphgo/db/migrations services/fphgo/db/schema/000_schema.sql services/fphgo/sqlc.yaml`: passed; diff shows additive migration/schema/sqlc config only in scoped paths.
- `git diff --check`: passed.

## Repairs Attempted

One patch application was retried after an index anchor in `000_schema.sql` did not match. No code repair loop was needed after the files were applied.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

`.ai/state/decisions.md` was not updated because no new durable product decision was made.

## Risks And Limitations

- `user_dive_sites` exists only as schema and sqlc query foundation; derivation logic is not implemented until Phase 3.
- `first_post_id` and `last_post_id` use `ON DELETE RESTRICT`; later media lifecycle code must recompute or remove read-model rows before hard-deleting proof posts.
- Visibility uses the existing `public | members | private` pattern. Enforcement is not implemented until read/API phases.
- sqlc generated `models.go` changes appear across feature packages because this repo's sqlc packages all read the shared schema snapshot.

## Next Phase Readiness

Ready for Phase 3: Media Post To User Dive Sites Derivation.
