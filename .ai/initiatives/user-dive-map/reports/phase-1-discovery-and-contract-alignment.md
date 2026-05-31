# Phase 1: Discovery And Contract Alignment

Final status: blocked

## Summary

Phase 1 completed read-only discovery and stopped before implementation.

The proof-based Dive Map foundation is technically feasible: existing media posts already carry owner and dive-site fields, profile/media route patterns exist, shared contract patterns exist, and web profile composition has an obvious place for a future Dive Map section.

The blocker is Dive Memories/tagged-user privacy. The locked initiative includes Dive Memories backend/UI phases and requires tagged/shared memories to appear only under strict unlock and visibility rules. The repository does not currently have a `dive_memories` module, tagged-memory tables, or an explicit authorization/privacy policy for tagged memory access. Implementing that would require inventing product/privacy behavior, which is a hard stop.

## Pre-Existing Dirty Worktree

`git status --short` before implementation showed pre-existing changes:

- `.ai/initiatives/profile-experience-integration/00-overview.md`
- `.ai/initiatives/profile-experience-integration/02-module-sequence.md`
- `.ai/initiatives/profile-experience-integration/03-cross-module-data-flow.md`
- `.ai/initiatives/profile-experience-integration/04-verification-plan.md`
- `.ai/initiatives/profile-experience-integration/phases/phase-2-source-of-truth-and-data-flow-verification.md`
- `.ai/initiatives/profile-experience-integration/phases/phase-8-api-dto-consistency-and-shared-contracts-audit.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

These did not touch `user-dive-map` implementation files and did not make Phase 1 discovery unreliable.

## Discovery Evidence

Source-of-truth tables and fields:

- `media_posts` exists in `services/fphgo/db/schema/000_schema.sql`.
- `media_posts.author_app_user_id` identifies the post owner.
- `media_posts.dive_site_id` already exists as nullable `UUID REFERENCES dive_sites(id) ON DELETE RESTRICT`.
- `media_posts.deleted_at` exists for soft deletion.
- `media_items` has `status`, `moderation_status`, and `deleted_at`.
- `dive_sites` is the target dive-site table, and current media write logic requires `ModerationState == "approved"`.
- `user_dive_sites` does not exist in the schema snapshot.

Existing media proof behavior:

- `services/fphgo/internal/features/media/service/service.go` enforces actor UUID, valid `diveSiteId`, configured site lookup, approved dive site, media object ownership, `profile_feed` context, active object state, and photo-only create-post flow.
- `services/fphgo/internal/features/media/repo/repo.go` publishes `media_posts` and `media_items`.
- Current profile media reads filter deleted media/posts, active users, approved dive sites, and block relationships.
- Current media post create route is `POST /v1/media/posts` under member + `media.write`.

Profile and route patterns:

- Public profile routes exist under `/v1/profiles/{username}`, `/v1/profiles/{username}/diving`, and `/v1/profiles/{username}/badges`.
- Profile module already owns profile-facing aggregate routes and is a plausible route parent for profile Dive Map reads.
- Existing route snapshot tests live under feature/app route tests.

Shared contract patterns:

- Shared web-facing contracts live under `packages/types/src/api`.
- Profile contracts currently live in `packages/types/src/api/profile.ts` and `packages/types/src/api/profile-view.ts`.
- Web imports profile contracts from `@freediving.ph/types`.

Web profile/media patterns:

- `apps/web/src/features/profile/pages/ProfilePage.tsx` composes profile header, bucket list, badges, and tabs.
- `apps/web/src/features/profile/api/profileApi.ts` delegates to `features/profiles/api/profiles`.
- `apps/web/src/features/profile/hooks/queries.ts` uses React Query with `queryKeys.profile`.
- Media profile queries already exist for profile media grids.

## Backend Boundary Recommendation

Use a new backend feature package for the proof read model:

- `services/fphgo/internal/features/dive_map`

Reason: `user_dive_sites` is a derived read model with source-of-truth rules that should not be buried inside media or profiles. Media should trigger derivation; profiles can expose profile-facing reads; Dive Map should own recompute/read-model behavior and tests.

Profile routes can still expose user-facing endpoints if that matches existing profile route conventions, but the source-of-truth logic should sit in `dive_map`, not in the web client and not in badges.

## Dive Memories V1 Decision

Blocked.

The initiative files include Dive Memories as later phases, so memories appear intended for V1. But the repository has no existing `dive_memories` package, schema, tagged-user model, or explicit privacy policy for tagged memory access.

The missing decision is not whether memories are useful. The missing decision is the privacy/auth rule for tagged memories:

- who can tag whom
- whether tagged users must be buddies/followers/group members
- whether tagged users can see private memories
- whether tags require acceptance
- how blocked users affect tagged memory access
- whether public/member/private visibility is enough for memories

Without that policy, implementing Phases 6 and 7 would be guessing. That violates the initiative hard stops for privacy ambiguity and required product decision.

## Verification Commands And Results

- `git status --short`: passed; recorded pre-existing `.ai` dirty files.
- `rg "media_posts|dive_site_id|visibility|profile" services/fphgo packages/types apps/web`: passed; found existing media/profile/dive-site/visibility surfaces.
- `find services/fphgo/internal/features -maxdepth 2 -type d | sort`: passed; no `dive_map` or `dive_memories` package exists.
- `find apps/web/src/features -maxdepth 2 -type d | sort`: passed; profile, media, explore, and diveSpots feature areas exist.
- Additional targeted reads: schema, media service/repo/routes, profile routes/contracts, web profile API/hooks/page.

No code-wise checks were run because this phase is read-only discovery.

## Repairs Attempted

None. Repairs are not allowed in this read-only phase.

## Files Changed

- `.ai/initiatives/user-dive-map/phases/phase-1-discovery-and-contract-alignment.md`
- `.ai/initiatives/user-dive-map/reports/phase-1-discovery-and-contract-alignment.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

`.ai/state/decisions.md` was not updated because no durable product decision was made. A missing decision was identified.

## Risks And Limitations

- `user_dive_sites` is not implemented yet.
- Profile Badges currently contain a transitional fallback that counts user-owned `media_posts.dive_site_id` when `user_dive_sites` is absent.
- Dive Memories/tagged-user privacy is unresolved.
- Existing media post creation requires `diveSiteId`, while the schema allows null for moments; later phases must preserve that distinction.

## Blocker

Hard stop: privacy/visibility ambiguity and required product decision for Dive Memories tagged-user access.

Required human decision:

Define the V1 Dive Memories privacy model, especially tagged-user access and tag acceptance/blocking rules, or explicitly remove/defer Dive Memories phases from `user-dive-map`.

## Next Phase Readiness

Not ready.

Phase 2 must not start until the Dive Memories privacy decision is recorded or the locked initiative is revised to remove/defer memory phases. Media-proof schema work alone is feasible, but the locked initiative cannot be executed end-to-end safely while memory privacy remains undefined.
