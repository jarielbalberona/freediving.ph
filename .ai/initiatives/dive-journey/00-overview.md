# Dive Journey

## Initiative Key

`dive-journey`

## Initiative Status

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Locked date: 2026-05-31

## Objective

Create an execution-ready plan for Dive Journey, the user's social/storytelling timeline. Dive Journey consumes memories, selected milestones, badges, map events, media activity, and manual user entries, but it must not become a source of truth for Dive Map, badges, certifications, or Dive Passport stats.

## Scope

- Backend canonical service: `services/fphgo`.
- Database migrations: `services/fphgo/db/migrations` and generated schema in `services/fphgo/db/schema/000_schema.sql`.
- Backend feature module likely involved: a new `services/fphgo/internal/features/dive_journey` package unless Phase 1 discovery proves an existing feature boundary is a better fit.
- Backend integration points with existing profile, media, and user identity/auth modules.
- Backend routing: `services/fphgo/internal/app/routes.go` and route snapshot tests.
- sqlc configuration: `services/fphgo/sqlc.yaml`, using per-feature query packages.
- Shared TypeScript API contracts: `packages/types/src`.
- Web frontend: `apps/web`, especially profile UI and API client/hook boundaries.
- Tests for migration validity, sqlc generation, Go repositories/services/handlers, authorization, shared contracts, web type-check/tests, and route snapshots when routes change.

## Non-Goals

- Do not implement Dive Map.
- Do not implement Dive Passport.
- Do not implement badge verification or badge earning logic.
- Do not implement formal certification verification.
- Do not implement full event/course integration unless discovery proves it already exists and is cheap.
- Do not implement notifications for tagged users unless already available and explicitly safe.
- Do not implement ranking/recommendation feed.
- Do not implement mobile app changes.
- Do not use Redis, cache infrastructure, queues, or new cloud dependencies for V1.
- Do not modify legacy `apps/api/*`.

## Acceptance Criteria

- `journey_entries` exists as the primary timeline entry model.
- Manual journey entries can exist without media and without `dive_site_id`.
- Journey entries support visibility controls using the existing product visibility model where possible.
- Journey entries can reference future generated sources through nullable `source_type` and `source_id`.
- Generated entries can be made idempotent by `source_type` and `source_id` where appropriate.
- Journey entries do not unlock Dive Map locations.
- Journey entries do not increase visited-site counts.
- Journey entries do not award badges.
- Journey entries do not verify credentials.
- Dive Map remains proof-based; Journey may consume map milestones but must never create map ownership.
- Shared/tagged memories must never unlock locations or inflate visited-site counts.
- Profile Journey read APIs and shared TypeScript contracts expose timeline entries safely.
- Authenticated APIs allow users to create/update/delete or hide manual Journey entries.
- Media attachments and tagged users are planned only where feasible and safe for V1.
- Future Dive Map, Badge, and Passport integration points are prepared without implementing those downstream systems.

## Domain Model

See `01-domain-model.md`.

## Module Sequence

See `02-module-sequence.md`.

## Cross-Module Data Flow

See `03-cross-module-data-flow.md`.

## Verification Plan

See `04-verification-plan.md`.

## Hard Stops

- Visibility rules are ambiguous, especially `followers` visibility if the follower model is not ready.
- Ownership/editing rules for generated entries are ambiguous.
- The plan conflicts with the locked `user-dive-map` initiative.
- Authentication or authorization model is unclear for profile reads, manual writes, generated entries, media attachments, or tagged users.
- Migration would delete, rewrite, or silently reinterpret existing user data.
- Follower visibility cannot be supported and no explicit product-approved fallback exists.
- Required product decision around hiding/archive/delete semantics cannot be answered from existing conventions.
- Repeated unrecoverable verification failures after bounded repair.

## Execution Readiness

This initiative is locked for future autonomous execution. Execution phases must remain pending until a human or runner explicitly starts them. Future agents must execute phases in dependency order and must not reinterpret Journey as a source of truth for Dive Map, badges, certifications, credentials, visited-site counts, or Passport stats.

Every phase report must include:

- phase status
- files changed
- implementation summary
- exact verification commands run
- pass/fail/skipped evidence
- repairs attempted
- hard stops or residual risks
- next phase readiness
