# User Dive Map Module Sequence

## Dependency Order

1. Discovery and contract alignment.
2. Backend schema/read model foundation.
3. Media post to `user_dive_sites` derivation.
4. Dive Map read APIs and shared contracts.
5. Web profile Dive Map UI.
6. Dive Memories backend.
7. Dive Memories UI and tagging.
8. Visibility/unlock enforcement hardening.
9. Badge/Journey/Passport integration preparation only.
10. Final verification/reporting.

## Phase 1: Discovery And Contract Alignment

Goal: inspect current media, profile, explore/dive site, auth, visibility, route, sqlc, and shared type patterns before changing code.

Primary modules:

- `services/fphgo/db/schema/000_schema.sql`
- `services/fphgo/db/migrations`
- `services/fphgo/internal/features/media`
- `services/fphgo/internal/features/profiles`
- `services/fphgo/internal/features/explore`
- `services/fphgo/internal/app/routes.go`
- `packages/types/src`
- `apps/web/src/features/media`
- `apps/web/src/features/profile`
- `apps/web/src/features/explore`

## Phase 2: Backend Schema/Read Model Foundation

Goal: add non-destructive persistence support for proof tagging and the `user_dive_sites` read model.

Primary modules:

- Goose migration in `services/fphgo/db/migrations`.
- Generated schema snapshot in `services/fphgo/db/schema/000_schema.sql`.
- Migration/schema drift tests under `services/fphgo/db`.
- sqlc package configuration for the selected backend feature boundary.

## Phase 3: Media Post Derivation

Goal: ensure media post create/update/delete or relevant lifecycle changes maintain `user_dive_sites`.

Primary modules:

- `services/fphgo/internal/features/media/repo`
- `services/fphgo/internal/features/media/service`
- New or existing Dive Map repository/service package.
- sqlc queries for media proof and derived read-model upsert/recompute.

## Phase 4: Dive Map Read APIs And Contracts

Goal: expose stable backend and shared TypeScript contracts for profile Dive Map and per-site marker detail reads.

Primary modules:

- `services/fphgo/internal/features/profiles`
- New or existing Dive Map backend feature package.
- `services/fphgo/internal/app/routes.go`
- `services/fphgo/internal/app/routes_snapshot_test.go`
- `packages/types/src/api`
- `packages/types/src/index.ts`

## Phase 5: Web Profile Dive Map UI

Goal: show a user's unlocked Dive Map section and detail access on profile surfaces.

Primary modules:

- `apps/web/src/features/profile`
- `apps/web/src/app/profile/[username]`
- `apps/web/src/app/[username]`
- Existing API client/hooks under `apps/web/src/features/profile/api` and hooks.
- Existing map or dive-site UI from `apps/web/src/features/explore` or `apps/web/src/features/diveSpots` when reusable.

## Phase 6: Dive Memories Backend

Goal: implement Dive Memories persistence and APIs if discovery confirms they are V1.

Primary modules:

- New backend feature package such as `services/fphgo/internal/features/dive_memories`.
- Goose migration and schema snapshot.
- sqlc configuration and generated query package.
- Route registration and route tests.

Hard boundary: if discovery proves memories are not V1, stop for product decision instead of silently deferring or half-building.

## Phase 7: Dive Memories UI And Tagging

Goal: allow authorized creation/read/update/delete of memories and tagged users in the web UI if Phase 6 implemented backend support.

Primary modules:

- `packages/types/src/api`
- `apps/web/src/features/profile`
- `apps/web/src/features/media`
- Potential new `apps/web/src/features/dive-memories` or locally consistent feature folder.

## Phase 8: Visibility/Unlock Enforcement Hardening

Goal: prove the hard sharing rules across service, repository, API, and UI boundaries.

Primary modules:

- Dive Map service tests.
- Dive Memories service tests.
- Profile/Dive Map handler tests.
- Shared type tests.
- Web tests for locked vs unlocked marker content where applicable.

## Phase 9: Badge/Journey/Passport Integration Preparation Only

Goal: document and expose clean read-model integration points without implementing badge, journey, or passport behavior.

Primary modules:

- Backend service method or repository query for `user_dive_sites` consumers.
- Minimal documentation where current backend docs convention supports it.
- Contract comments or type names only where useful; no product implementation.

## Phase 10: Final Verification/Reporting

Goal: run the full relevant verification set, write reports, and leave state accurate.

Primary modules:

- `.ai/initiatives/user-dive-map/reports`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- Git diff review.
