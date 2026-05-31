# Profile Experience Integration

## Initiative Key

`profile-experience-integration`

## Initiative Status

- Status: locked
- Ready for execution: yes
- Execution started: no
- Locked date: 2026-05-31

## Objective

Create an execution-ready plan to verify and harden the end-to-end integration of Profile Badges, User Dive Map, Dive Journey, and Dive Passport as one coherent profile experience.

The work is integration-focused. It must identify and repair source-of-truth conflicts, duplicate data models, broken visibility rules, inconsistent shared contracts, and incoherent profile UI composition without changing the ownership boundaries established by the locked initiatives.

## Scope

- Existing Profile Badges implementation under `services/fphgo/internal/features/profiles`, `packages/types/src/api/badges.ts`, and `apps/web/src/features/profile`.
- Locked initiatives:
  - `.ai/initiatives/user-dive-map/`
  - `.ai/initiatives/dive-journey/`
  - `.ai/initiatives/dive-passport/`
- Backend integration/audit work in `services/fphgo`, especially profile, badges, Dive Map, Journey, Passport, routes, and tests.
- Shared API contract audit in `packages/types/src`.
- Web public profile composition audit in `apps/web`.
- Tests for cross-module invariants, source-of-truth ownership, visibility filtering, shared contracts, route snapshots, and web profile composition.

## Non-Goals

- Do not reimplement Profile Badges, Dive Map, Dive Journey, or Dive Passport from scratch.
- Do not create duplicate source-of-truth tables.
- Do not implement new product features outside integration hardening.
- Do not implement mobile.
- Do not add Redis, cache infrastructure, queues, or new cloud dependencies.
- Do not modify legacy `apps/api/*`.
- Do not weaken the locked product rules from the source initiatives.

## Acceptance Criteria

- Profile Badges, Dive Map, Dive Journey, and Dive Passport have explicit one-way data ownership boundaries.
- Dive Map remains the source of truth for visited dive sites through `user_dive_sites`.
- Dive Map locations are unlocked only by qualifying user-owned `media_posts` tagged to `dive_site_id`.
- Shared/tagged memories do not unlock map locations or inflate visited-site counts.
- Profile Badges do not create competing dive-site truth.
- Dive Sites Visited auto stat aligns with `user_dive_sites`.
- Future map-based badges source from `user_dive_sites`, not memories.
- Badge `source_type`/`source_id` can support `dive_map` origins.
- Badge additions can feed Journey display entries without Journey awarding, verifying, revoking, or mutating badges.
- Dive Journey can consume map milestones and badge additions, but does not create map ownership, inflate counts, award badges, or verify credentials.
- Dive Passport aggregates profile, badges, map preview, journey highlights, memories/media, and stats without mutating child systems or duplicating source data.
- Public profile UI presents badges, map, journey, and passport coherently for owners and public viewers.
- Visibility filtering is consistent across Passport, Journey, Map, and Badges.

## Domain Model

See `01-domain-model.md`.

## Module Sequence

See `02-module-sequence.md`.

## Cross-Module Data Flow

See `03-cross-module-data-flow.md`.

## Verification Plan

See `04-verification-plan.md`.

## Hard Stops

- Locked initiative specs conflict.
- Source-of-truth ownership is ambiguous.
- Privacy or visibility behavior is ambiguous across child modules.
- A migration would be destructive or would duplicate source data.
- Passport attempts to duplicate module source data.
- Journey attempts to act as a source of truth.
- Journey attempts to award, verify, revoke, or mutate Profile Badges.
- Badge/Dive Map integration would count memories or shared/tagged data as proof.
- Profile UI composition requires an unresolved product/UX decision.
- Repeated unrecoverable verification failures after bounded repair.

## Execution Readiness

This initiative is locked and ready for future autonomous execution. Execution phases must remain pending until a human or runner explicitly starts them. Future agents must execute phases in dependency order and must treat this as integration hardening, not permission to rewrite the feature set.

Every phase report must include:

- phase status
- files changed
- integration summary
- exact verification commands run
- pass/fail/skipped evidence
- repairs attempted
- source-of-truth or visibility risks found
- next phase readiness
