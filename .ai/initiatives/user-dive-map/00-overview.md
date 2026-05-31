# User Dive Map

## Initiative Key

`user-dive-map`

## Initiative Status

- Status: locked
- Ready for execution: yes
- Execution started: no
- Locked date: 2026-05-31

## Objective

Create the first execution-ready plan for a proof-based User Dive Map. A user unlocks a dive site marker only when the user personally owns at least one qualifying media post tagged to that `dive_site_id`.

The implementation must establish `user_dive_sites` as the derived read model for unlocked map markers, preserve media posts as the source of proof, and keep Dive Memories social/contextual instead of visit proof.

## Scope

- Backend canonical service: `services/fphgo`.
- Database migrations: `services/fphgo/db/migrations` and generated schema in `services/fphgo/db/schema/000_schema.sql`.
- Backend feature modules likely involved: `services/fphgo/internal/features/media`, `services/fphgo/internal/features/profiles`, `services/fphgo/internal/features/explore`, and a new `services/fphgo/internal/features/dive_map` or equivalent if discovery proves that cleaner.
- Backend routing: `services/fphgo/internal/app/routes.go` and route snapshot tests.
- sqlc configuration: `services/fphgo/sqlc.yaml`, using per-feature query packages.
- Shared TypeScript API contracts: `packages/types/src`.
- Web frontend: `apps/web`, especially profile, media, and dive-site/detail UI boundaries.
- Tests for migration validity, sqlc generation, Go services/repositories/handlers, shared TypeScript contracts, and web type-check/tests.

## Non-Goals

- Do not implement Dive Passport.
- Do not implement Dive Journey.
- Do not implement badge awarding logic; only prepare clean integration points from `user_dive_sites`.
- Do not implement favorites, want-to-visit, manual visit count, region grouping, advanced map filters, or formal verification system.
- Do not use Redis, cache infrastructure, queues, or new cloud dependencies for V1.
- Do not modify legacy `apps/api/*`.
- Do not treat tagged/shared memories as visit proof.

## Acceptance Criteria

- `media_posts` can support `dive_site_id` for qualifying proof posts without destructive migration.
- `user_dive_sites` exists as a derived/materialized read model keyed by `user_id` and `dive_site_id`.
- `user_dive_sites` is populated only from qualifying, user-owned `media_posts` tagged to a `dive_site_id`.
- Shared/tagged Dive Memories do not create `user_dive_sites` rows.
- Shared/tagged Dive Memories do not increase visited-site counts.
- Shared/tagged Dive Memories appear in a user's Dive Map marker only when that user has already unlocked the same `dive_site_id`.
- Profile Dive Map read APIs and shared contracts expose unlocked sites and per-site marker contents.
- Web profile Dive Map UI can show unlocked sites and site detail contents using shared contracts.
- Future badge, Dive Journey, and Dive Passport consumers have stable read-model integration points without implementing those products.
- Verification evidence includes migration checks, sqlc generation, Go tests, shared type tests, web type-check/tests, route snapshot checks when routes change, and a final git diff check.

## Domain Model

See `01-domain-model.md`.

## Module Sequence

See `02-module-sequence.md`.

## Cross-Module Data Flow

See `03-cross-module-data-flow.md`.

## Verification Plan

See `04-verification-plan.md`.

## Hard Stops

- Existing `media_posts` schema cannot support `dive_site_id` without destructive migration.
- Ownership or author identity for media posts is ambiguous.
- Visibility rules for media posts or memories conflict with current authorization behavior.
- Required product decision around whether Dive Memories are V1 or should be deferred.
- Required product decision around what qualifies a media post as proof.
- Authentication or authorization model is unclear for profile map reads, memory reads, memory writes, or tagged user access.
- A migration would delete, rewrite, or silently reinterpret existing user data.
- Existing source-of-truth assumptions conflict between media, memories, profiles, explore sites, or feed.
- Repeated unrecoverable verification failures after bounded repair.

## Execution Readiness

This initiative is locked for autonomous execution. Future agents may execute phases in dependency order, starting with Phase 1 only. Execution must not skip phases, merge phases without updating reports, or reinterpret the proof model.

Every phase report must include:

- phase status
- files changed
- implementation summary
- exact verification commands run
- pass/fail/skipped evidence
- repairs attempted
- hard stops or residual risks
- next phase readiness
