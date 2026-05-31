# Dive Passport

## Initiative Key

`dive-passport`

## Initiative Status

- Status: locked
- Ready for execution: yes
- Execution started: no
- Locked date: 2026-05-31

## Objective

Create an execution-ready plan for Dive Passport, the public diver identity/showcase layer. Dive Passport is a composed read model and presentation layer over profile, Dive Map, Profile Badges, Dive Journey, media, memories, and stats. It must not become a source of truth.

## Scope

- Backend canonical service: `services/fphgo`.
- Backend aggregate read API for a profile Passport.
- Optional settings persistence only if Phase 1 confirms it is low-risk and presentation-only.
- Backend feature module likely involved: a new `services/fphgo/internal/features/dive_passport` package or a profile-owned aggregate service if discovery proves that cleaner.
- Backend integration points with profiles, badges, Dive Map, Dive Journey, media, and memories.
- Backend routing: `services/fphgo/internal/app/routes.go` and route snapshot tests.
- sqlc configuration only if settings schema is added.
- Shared TypeScript API contracts: `packages/types/src`.
- Web frontend: `apps/web`, especially profile UI and API client/hook boundaries.
- Tests for aggregate service/handlers, visibility filtering, shared contracts, web type-check/tests, and route snapshots when routes change.

## Non-Goals

- Do not implement Dive Map.
- Do not implement Dive Journey.
- Do not implement badge verification.
- Do not implement certification authority behavior.
- Do not implement Passport PDF/export.
- Do not implement mobile app changes.
- Do not implement ranking/reputation scoring.
- Do not create any table that duplicates badge, map, journey, media, memory, certification, or stats source data.
- Do not create a primary `dive_passports` source-of-truth table.
- Do not use Redis, cache infrastructure, queues, or new cloud dependencies for V1.
- Do not modify legacy `apps/api/*`.

## Acceptance Criteria

- Passport exposes a stable profile-facing aggregate DTO.
- Passport reads from existing child systems and applies visibility filtering.
- Passport does not create or mutate Dive Map locations.
- Passport does not increase visited-site counts.
- Passport does not create or mutate Journey entries.
- Passport does not create, award, verify, or mutate badges.
- Passport does not verify credentials or certifications.
- Passport does not become a competing source of truth.
- Dependencies remain one-way: Map/Journey/Badges/Profile/Media feed Passport; Passport does not feed those source systems.
- Passport supports stable empty states when Dive Map, Dive Journey, or Badges are missing or unavailable.
- Passport supports stable empty states for a new user profile, no memories, no media, and no badges.
- Optional Passport settings, if implemented, store presentation preferences only.
- Web profile Passport UI consumes shared contracts and does not infer source-of-truth behavior client-side.
- Verification evidence proves Passport remains a composed read/presentation layer.

## Domain Model

See `01-domain-model.md`.

## Module Sequence

See `02-module-sequence.md`.

## Cross-Module Data Flow

See `03-cross-module-data-flow.md`.

## Verification Plan

See `04-verification-plan.md`.

## Hard Stops

- Dive Map or Dive Journey contracts are unavailable, absent, or contradictory.
- Visibility rules across child systems are ambiguous.
- Authentication or authorization model is unclear for public profile Passport reads or owner settings writes.
- Product decision is required around settings, featured badges, ordering, or public/private section controls.
- Any implementation path risks duplicating source data into Passport-owned storage.
- A migration would create a `dive_passports` source-of-truth table.
- A migration would delete, rewrite, or silently reinterpret existing user data.
- Empty-state behavior for missing child systems cannot be represented in the aggregate contract.
- Repeated unrecoverable verification failures after bounded repair.

## Execution Readiness

This initiative is locked and ready for future autonomous execution. Execution phases must remain pending until a human or runner explicitly starts them. Future agents must execute phases in dependency order and must not reinterpret Passport as a source of truth.

Every phase report must include:

- phase status
- files changed
- implementation summary
- exact verification commands run
- pass/fail/skipped evidence
- repairs attempted
- hard stops or residual risks
- next phase readiness
