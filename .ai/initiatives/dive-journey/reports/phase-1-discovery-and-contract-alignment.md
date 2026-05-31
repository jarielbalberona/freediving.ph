# Phase 1: Discovery And Contract Alignment

Final status: passed

## Summary

Completed read-only discovery for Dive Journey implementation boundaries. The initiative can proceed with a new backend feature package and must keep Journey downstream from User Dive Map.

## Findings

- Backend boundary: create `services/fphgo/internal/features/dive_journey` rather than extending profile/media/feed. Journey owns timeline entries; profile only composes reads.
- Follower visibility: implementable using `saved_users`. Profile reads already use `saved_users` for follower/following counts and `isFollowing`; web profile uses save/unsave as Follow/Following.
- Blocking: `user_blocks` is the active block primitive and existing profile/buddy reads enforce either-direction blocking.
- Visibility conventions:
  - Profile diving currently uses `public | members | private`.
  - Feed activity supports `public | members | followers | group_members | private`, but current feed queries explicitly exclude `followers` from public/latest listing.
  - Journey can use `public | followers | private`, with `followers` resolved through `saved_users`.
- Hide/delete/archive conventions:
  - Feed uses `user_hidden_feed_items` for per-viewer hide.
  - Media and Chika use soft delete/hidden state fields.
  - Journey should use entry `state` plus owner-only delete/hide semantics, with generated entries hidden rather than destructively deleted.
- Tagged-user support:
  - No reusable backend tagged-user acceptance/decline/blocking/privacy model exists.
  - Mention notification preferences exist, but they are not a tagging authorization model.
  - V1 tagging must be implemented only if a later phase can keep it simple and explicit; tags must not grant proof, ownership, map unlocks, badges, credentials, or counts.
- Profile UI boundary: profile tabs already host Diving and Posts. Journey should be a profile section/tab addition following existing profile feature API/hooks/components patterns.
- Shared contracts: cross-boundary Journey DTOs belong in `packages/types/src/api`, not feature-local frontend types.

## User Dive Map Compatibility

User Dive Map remains the proof/location source. Dive Journey may reference `dive_site_id` for storytelling context, but Journey entries must not insert, update, or count `user_dive_sites`, and must not affect Dive Sites Visited.

## Verification Commands And Results

- `git status --short`: passed; dirty worktree is expected from the completed `user-dive-map` initiative and does not make discovery unreliable.
- `rg "visibility|followers|follow|archive|hide|delete|tagged|media" services/fphgo packages/types apps/web`: passed; output reviewed.
- `find services/fphgo/internal/features -maxdepth 2 -type d | sort`: passed.
- `find apps/web/src/features -maxdepth 2 -type d | sort`: passed.

Additional targeted discovery:

- `rg -n "CREATE TABLE.*follow|followers|following|followed|follower" services/fphgo/db/schema/000_schema.sql services/fphgo/db/migrations services/fphgo/internal/features packages/types/src apps/web/src/features | head -200`: reviewed.
- `rg -n "CREATE TABLE IF NOT EXISTS saved_users|saved_users" services/fphgo/db/schema/000_schema.sql services/fphgo/internal/features/profiles services/fphgo/internal/features/*/repo/queries apps/web/src/features/profile apps/web/src/features/profiles | head -180`: reviewed.
- `rg -n "tagged_user|tagged|mentions|mention|Tag" services/fphgo/db/schema/000_schema.sql services/fphgo/internal/features packages/types/src apps/web/src/features | head -240`: reviewed.

## Repairs Attempted

None. This phase was read-only.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

`.ai/state/decisions.md` was not updated because no new durable project decision was made.

## Risks And Limitations

- Tagged-user Journey behavior remains risky without a dedicated acceptance/privacy policy. Later phases must not fake that policy.
- Generated-entry editing semantics should prefer hide/archive for non-manual entries unless later evidence proves a stronger convention.

## Next Phase Readiness

Ready for Phase 2: Backend Schema Foundation.
