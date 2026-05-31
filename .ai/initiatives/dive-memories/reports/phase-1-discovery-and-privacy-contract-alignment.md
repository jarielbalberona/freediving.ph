# Phase 1 Report: Discovery And Privacy Contract Alignment

## Status

passed

## Summary

Phase 1 confirmed the repository has enough existing primitives to execute Dive Memories V1 without guessing privacy policy. `user_blocks` is available for bidirectional blocking checks. `saved_users` is available and already used by Dive Journey for `followers` visibility, so Dive Memories V1 may support `followers` using the same semantics.

## Files Changed

- `.ai/initiatives/dive-memories/phases/phase-1-discovery-and-privacy-contract-alignment.md`
- `.ai/initiatives/dive-memories/reports/phase-1-discovery-and-privacy-contract-alignment.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `.ai/state/decisions.md`

No application code was modified.

## Verification Results

### Verification Summary

- Commands run: 3
- Passed: 3
- Failed: 0
- Skipped: 0

### Exact Commands Run

- `rg -n "user_blocks|saved_users|followers|blocking|blocked" services/fphgo/internal services/fphgo/db`
  - Result: pass
  - Evidence: found `user_blocks` schema/indexes, broad block filtering patterns, `saved_users`, and Dive Journey follower filtering through `viewer_follows`.
- `rg -n "user_dive_sites|dive-map|dive_map|passport|journey|badges" services/fphgo/internal packages/types/src apps/web/src/features/profile`
  - Result: pass
  - Evidence: found Dive Map `user_dive_sites` queries, Journey generated-entry helpers, Passport aggregate routes/services, Profile Badges contracts, and profile web composition surfaces.
- `git diff --check`
  - Result: pass

## Durable Decision

Updated `.ai/state/decisions.md` with the V1 visibility policy: Dive Memories supports `public`, `followers`, `tagged`, and `private`; `followers` uses existing `saved_users` follower semantics.

## Boundary Evidence

- Blocking source: `user_blocks` in `services/fphgo/db/schema/000_schema.sql` and existing query filters across media/explore/messaging/Journey.
- Follower source: `saved_users`, already used by Dive Journey query/service behavior.
- Dive Map source of truth: `user_dive_sites` in `services/fphgo/internal/features/dive_map` and profile map reads.
- Journey source conventions: `source_type`/`source_id` generated-entry helpers in Dive Journey.
- Passport boundary: `GET /v1/profiles/{username}/passport` aggregate and presentation-only settings.
- Badges boundary: Profile Badges `dive_map` source support and `user_dive_sites` visited-site contract.

## Risks And Limitations

- active: Future changes to `saved_users` follower semantics must retest Dive Journey and Dive Memories together.
- active: Tag lifecycle and blocking enforcement still need implementation and tests in later phases.

## Next Phase Readiness

Ready for Phase 2 Backend Schema/Domain Foundation.
