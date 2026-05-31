# User Dive Map

## Initiative Key

`user-dive-map`

## Initiative Status

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Locked date: 2026-05-31
- Relocked date: 2026-05-31
- Previous hard-stop: Phase 1 previously blocked on unresolved Dive Memories/tagged-user privacy rules. That blocker is resolved by de-scoping Dive Memories and tagged-user sharing from User Dive Map V1.
- Latest execution status: completed on 2026-05-31. Final report: `.ai/initiatives/user-dive-map/reports/final-report.md`.

## Objective

Implement a proof-based User Dive Map. A user unlocks a dive site marker only when the user personally owns at least one qualifying media post tagged to that `dive_site_id`.

The implementation must establish `user_dive_sites` as the derived read model for unlocked map markers, preserve media posts as the only V1 source of proof, expose profile Dive Map reads, render the profile Dive Map UI, and prepare downstream integration points for Profile Badges, Dive Journey, and Dive Passport.

## Scope

- Backend canonical service: `services/fphgo`.
- Database migrations: `services/fphgo/db/migrations` and generated schema in `services/fphgo/db/schema/000_schema.sql`.
- Backend feature modules likely involved: `services/fphgo/internal/features/media`, `services/fphgo/internal/features/profiles`, `services/fphgo/internal/features/explore`, and a new `services/fphgo/internal/features/dive_map`.
- Backend routing: `services/fphgo/internal/app/routes.go` and route snapshot tests.
- sqlc configuration: `services/fphgo/sqlc.yaml`, using per-feature query packages.
- Shared TypeScript API contracts: `packages/types/src`.
- Web frontend: `apps/web`, especially profile, media, and dive-site/detail UI boundaries.
- Tests for migration validity, sqlc generation, Go services/repositories/handlers, shared TypeScript contracts, web type-check/tests, and source-of-truth invariants.

## Non-Goals

- Do not implement Dive Memories.
- Do not implement `dive_memories`, `dive_memory_media`, or `dive_memory_tagged_users`.
- Do not implement memory creation, read/write APIs, edit/delete flows, or memory UI.
- Do not implement tagged-user access, tag acceptance/decline, blocking behavior for memory tags, or shared-memory visibility.
- Do not show shared/tagged memories inside map markers in V1.
- Do not implement Dive Passport.
- Do not implement Dive Journey.
- Do not implement badge awarding logic; only prepare clean integration points from `user_dive_sites`.
- Do not implement favorites, want-to-visit, manual visit count, region grouping, advanced map filters, or formal verification system.
- Do not use Redis, cache infrastructure, queues, or new cloud dependencies for V1.
- Do not modify legacy `apps/api/*`.

## Acceptance Criteria

- `media_posts` supports `dive_site_id` for qualifying proof posts without destructive migration.
- `user_dive_sites` exists as a derived/materialized read model keyed by `user_id` and `dive_site_id`.
- `user_dive_sites` is populated only from qualifying, user-owned `media_posts` tagged to a `dive_site_id`.
- A dive site is unlocked only by a qualifying user-owned media post tagged to `dive_site_id`.
- Shared/tagged memories do not create `user_dive_sites` rows.
- Shared/tagged memories do not increase visited-site counts.
- V1 marker details include only the target user's own qualifying media posts for that site.
- V1 marker details do not include own memories, shared memories, tagged memories, or memory-derived content.
- Profile Dive Map read APIs and shared contracts expose unlocked sites, visited-site count, and per-site proof media details.
- Web profile Dive Map UI can show unlocked sites and site detail contents using shared contracts.
- Dive Sites Visited aligns with `user_dive_sites`.
- Future Profile Badges, Dive Journey, and Dive Passport consumers have stable read-model integration points without implementing those products.
- Verification evidence includes migration checks, sqlc generation, Go tests, shared type tests, web type-check/tests, route snapshot checks when routes change, and a final git diff check.

## Deferred Follow-Up

Create a separate locked `dive-memories` initiative before shared memories are integrated into map markers. That initiative must define memory ownership, tagged-user access, tag acceptance/decline, blocking behavior, visibility, authorization, and how memory content may be displayed after a user has already unlocked a site through `user_dive_sites`.

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
- Visibility rules for profile map reads or proof media conflict with current authorization behavior.
- Required product decision around what qualifies a media post as proof.
- Authentication or authorization model is unclear for profile map reads.
- A migration would delete, rewrite, or silently reinterpret existing user data.
- Existing source-of-truth assumptions conflict between media, profiles, explore sites, feed, or badges.
- Any phase attempts to implement Dive Memories or tagged-user sharing inside User Dive Map V1.
- Repeated unrecoverable verification failures after bounded repair.

## Execution Readiness

This initiative is relocked for autonomous execution. Future agents may execute phases in dependency order, starting with Phase 1 only. Execution must not skip phases, merge phases without updating reports, or reinterpret the proof model.

Every phase report must include:

- phase status
- files changed
- implementation summary
- exact verification commands run
- pass/fail/skipped evidence
- repairs attempted
- hard stops or residual risks
- next phase readiness
