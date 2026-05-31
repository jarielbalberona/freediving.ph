# Phase 1: Discovery And Contract Alignment

Final status: passed

## Summary

Phase 1 completed read-only discovery after the User Dive Map V1 relock. The previous Dive Memories/tagged-user blocker is resolved by scope correction: Dive Memories, memory media, tagged users, tag acceptance/blocking, shared-memory visibility, and shared/tagged memories inside map markers are out of User Dive Map V1.

The initiative can proceed to Phase 2. Media proof foundations are present, and no V1 phase currently requires Dive Memories or tagged-user sharing behavior.

## Changes

No application code changed in this phase. The only changes are phase status, this report, and required `.ai/state` updates.

## Discovery Evidence

Source-of-truth tables and fields:

- `media_posts` exists in `services/fphgo/db/schema/000_schema.sql`.
- `media_posts.author_app_user_id` identifies the post owner.
- `media_posts.dive_site_id` already exists as nullable `UUID REFERENCES dive_sites(id) ON DELETE RESTRICT`.
- `media_posts.deleted_at` exists for soft deletion.
- `media_items` has `status`, `moderation_status`, and `deleted_at`.
- `dive_sites` is the target dive-site table; current media write logic requires approved dive sites.
- `user_dive_sites` does not yet exist in the schema snapshot and must be created in Phase 2.

Existing media proof behavior:

- `services/fphgo/internal/features/media/service/service.go` enforces actor UUID, valid `diveSiteId`, configured site lookup, approved dive site, media object ownership, `profile_feed` context, active object state, and photo-only create-post flow.
- `services/fphgo/internal/features/media/repo/repo.go` publishes `media_posts` and `media_items`.
- Current profile media/dive-spot highlight reads already filter deleted posts/items, active users, approved sites, and block relationships.
- Current media post create route is `POST /v1/media/posts` under member + `media.write`.

Route and auth patterns:

- Public profile routes exist under `/v1/profiles/{username}`, `/v1/profiles/{username}/diving`, and `/v1/profiles/{username}/badges`.
- `services/fphgo/internal/app/routes.go` mounts public profile routes and media routes under the API auth/identity middleware group.
- Profile routes are the natural route parent for profile-facing map reads; Dive Map business rules should live in a dedicated feature package.

Shared contract patterns:

- Shared web-facing contracts live under `packages/types/src/api`.
- Profile contracts currently live in `packages/types/src/api/profile.ts` and `packages/types/src/api/profile-view.ts`.
- Web imports profile contracts from `@freediving.ph/types`.

Web profile/media patterns:

- `apps/web/src/features/profile/api/profileApi.ts` delegates to `features/profiles/api/profiles`.
- `apps/web/src/features/profile/hooks/queries.ts` uses React Query with `queryKeys.profile`.
- `apps/web/src/features/profile` and `apps/web/src/features/media` are the right frontend boundaries for later phases.

## Backend Boundary Recommendation

Use a new backend feature package for the proof read model:

- `services/fphgo/internal/features/dive_map`

Reason: `user_dive_sites` is a derived read model with source-of-truth rules that should not be buried inside media or profiles. Media should trigger derivation; profiles can expose profile-facing reads; Dive Map should own recompute/read-model behavior and tests.

## Dive Memories Scope Confirmation

Dive Memories are deferred from User Dive Map V1.

The active relocked phase sequence contains no Dive Memories backend phase, no Dive Memories UI/tagging phase, and no shared-memory visibility enforcement phase. V1 marker detail should return only the target user's own qualifying media posts.

## Verification Commands And Results

- `git status --short`: passed. At phase start the only dirty file was `.ai/initiatives/user-dive-map/phases/phase-1-discovery-and-contract-alignment.md` after setting status to `in_progress`.
- `rg "media_posts|dive_site_id|visibility|profile" services/fphgo packages/types apps/web`: passed; found existing media/profile/dive-site/visibility surfaces.
- `find services/fphgo/internal/features -maxdepth 2 -type d | sort`: passed; no `dive_map` package exists yet and should be created in later phases.
- `find apps/web/src/features -maxdepth 2 -type d | sort`: passed; profile, media, explore, and diveSpots feature areas exist.
- Additional targeted reads: schema, media service/repo/routes, profile routes/contracts, app route mounting, web profile API/hooks.

No code-wise checks were required because this phase is read-only discovery.

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

`.ai/state/decisions.md` was not updated in this phase because the durable deferral decision was already recorded during relock.

## Risks And Limitations

- `user_dive_sites` is not implemented yet.
- Profile Badges currently contain a transitional fallback that counts user-owned `media_posts.dive_site_id` when `user_dive_sites` is absent.
- Existing media post creation requires `diveSiteId`, while the schema allows null for moments; later phases must preserve that distinction.
- Dive Memories remain deferred until a separate locked initiative exists.

## Next Phase Readiness

Ready for Phase 2: Backend Schema/Read Model Foundation.
