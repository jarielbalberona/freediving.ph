# User Dive Map Module Sequence

## Dependency Order

1. Discovery and contract alignment.
2. Backend schema/read model foundation.
3. Media post to `user_dive_sites` derivation.
4. Dive Map read APIs and shared contracts.
5. Web profile Dive Map UI.
6. Map read model hardening.
7. Profile UI hardening.
8. Badge/Journey/Passport integration preparation only.
9. Final verification/reporting.

## Removed From V1 Sequence

The previous Dive Memories backend, Dive Memories UI/tagging, and shared-memory visibility enforcement phases are removed from User Dive Map V1. Those belong in a future separate `dive-memories` initiative after privacy and tagging rules are locked.

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
- route tests/snapshots under `services/fphgo/internal/app`
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

## Phase 6: Map Read Model Hardening

Goal: prove the hard V1 rule that only qualifying owned media posts create markers, counts, and marker detail contents.

Primary modules:

- Dive Map service/repository tests.
- Media lifecycle derivation tests.
- Profile read handler tests.
- Shared type tests if marker DTOs need stronger shape assertions.

## Phase 7: Profile UI Hardening

Goal: harden profile Dive Map UI states without expanding into memories, Journey, Passport, badges, or advanced map features.

Primary modules:

- `apps/web/src/features/profile`
- shared contract imports from `@freediving.ph/types`
- web tests for empty, loading, error, populated, locked-detail, and responsive states where local conventions support them.

## Phase 8: Badge/Journey/Passport Integration Preparation Only

Goal: document and expose clean read-model integration points without implementing badge, journey, or passport behavior.

Primary modules:

- Backend service method or repository query for `user_dive_sites` consumers.
- Minimal documentation where current backend docs convention supports it.
- Contract comments or type names only where useful; no product implementation.

## Phase 9: Final Verification/Reporting

Goal: run the full relevant verification set, write reports, and leave state accurate.

Primary modules:

- `.ai/initiatives/user-dive-map/reports`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- Git diff review.
