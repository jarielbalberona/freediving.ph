# Dive Memories

## Initiative Key

`dive-memories`

## Dependencies

depends_on: user-dive-map, dive-journey, dive-passport, profile-experience-integration

## Initiative Status

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Latest execution status: execution started on 2026-05-31.

## Objective

Implement Dive Memories as the social/contextual trip-memory layer that was intentionally deferred from User Dive Map V1.

Dive Memories may be attached to a `dive_site_id`, may include media, and may tag other users, but they are not proof that any user visited a dive site. They must integrate with Dive Map, Dive Journey, Dive Passport, and Profile Badges without changing source-of-truth ownership.

## Scope

- Backend canonical service: `services/fphgo`.
- Database migrations: `services/fphgo/db/migrations` and generated schema in `services/fphgo/db/schema/000_schema.sql`.
- Backend feature module likely involved: new `services/fphgo/internal/features/dive_memories`.
- Backend route wiring: `services/fphgo/internal/app/routes.go` and route snapshot tests when routes change.
- sqlc configuration: `services/fphgo/sqlc.yaml`, using per-feature query packages.
- Shared TypeScript API contracts: `packages/types/src`.
- Web frontend: `apps/web`, especially profile Diving tab, Dive Map marker detail, Journey/Passport integration surfaces, and memory management surfaces where feasible.
- Tests for migrations, sqlc generation, Go repo/service/handler behavior, authorization, blocking, tag acceptance, source-of-truth invariants, shared contracts, and web behavior.

## Non-Goals

- Do not make Dive Memories proof of visiting a dive site.
- Do not let memories unlock Dive Map locations.
- Do not let memories increase visited-site counts.
- Do not mutate `user_dive_sites` from memory creation, tag acceptance, media attachment, or deletion.
- Do not award badges directly from memories in V1.
- Do not verify credentials from memories.
- Do not implement notifications.
- Do not implement real-time updates.
- Do not implement mobile UI.
- Do not implement formal location check-in proof.
- Do not implement AI-generated memories.
- Do not implement a complex album editor.
- Do not implement public follower visibility if the follower model is not technically ready.
- Do not modify legacy `apps/api/*`.
- Do not add Redis, queues, cache infrastructure, or new cloud services for V1.

## Acceptance Criteria

- `dive_memories`, `dive_memory_media`, and `dive_memory_tagged_users` are modeled without destructive migrations.
- Map-attached Dive Memories require a `dive_site_id` in V1.
- Standalone non-site social entries remain Journey entries, not Dive Memories.
- A user can create a Dive Memory for a dive site even if they have not unlocked that site, but it must not appear inside their Dive Map marker unless `user_dive_sites` proves they unlocked the same site.
- Tagged/shared memories appear inside a tagged user's Dive Map marker only if the tagged user has also unlocked that dive site through `user_dive_sites` and tag status/visibility allows display.
- Memory creation, update, deletion, media attachment, and tagging never create, update, or delete `user_dive_sites`.
- Memories do not increase visited-site counts.
- Memories do not award badges directly.
- Memories do not verify credentials.
- Tagged users are pending by default and are not publicly presented as accepted participants until accepted.
- Declined/hidden tags suppress tagged-user association from public/tagged display.
- Blocked users cannot be tagged and cannot access a memory through a tag.
- Visibility rules are implemented or hard-stopped when unsupported:
  - `public`: visible according to public profile/content rules.
  - `followers`: visible only if existing relationship visibility is technically available; otherwise defer or downgrade according to a locked decision.
  - `tagged`: visible to author and allowed tagged users only.
  - `private`: visible only to author.
- Dive Journey may expose/create a memory Journey entry, but Journey remains storytelling-only and downstream.
- Dive Passport may show recent visible memories, but Passport does not use memories for visited-site counts or proof.
- Profile Badges do not consume memories as badge proof in V1.

## Domain Model

See `01-domain-model.md`.

## Module Sequence

See `02-module-sequence.md`.

## Cross-Module Data Flow

See `03-cross-module-data-flow.md`.

## Verification Plan

See `04-verification-plan.md`.

## Hard Stops

- Blocking/privacy system is unavailable or ambiguous for tagged-memory authorization.
- Follower visibility is technically unavailable but required by the phase.
- Tag acceptance/display rules are ambiguous.
- Standalone non-site Dive Memories are required without a product decision.
- Any implementation would mutate `user_dive_sites` from memories.
- Any implementation would let memories unlock locations or inflate visited-site counts.
- Any implementation would award badges directly or verify credentials from memories.
- A migration would be destructive or duplicate existing source data.
- Locked profile experience source-of-truth rules conflict with this initiative.
- Repeated verification failures cannot be repaired inside the current phase scope.
