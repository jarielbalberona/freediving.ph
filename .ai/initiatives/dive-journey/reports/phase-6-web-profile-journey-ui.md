# Phase 6: Web Profile Journey UI

Final status: passed

## Summary

Added the web profile Journey UI surface using shared contracts and backend APIs. Journey is rendered as storytelling content inside the profile Diving tab and does not calculate proof, visited-site counts, badges, credentials, or Passport state in the browser.

## Files Changed

- `apps/web/src/lib/api/fphgo-routes.ts`
- `apps/web/src/lib/query/query-keys.ts`
- `apps/web/src/features/profiles/api/profiles.ts`
- `apps/web/src/features/profile/api/profileApi.ts`
- `apps/web/src/features/profile/hooks/queries.ts`
- `apps/web/src/features/profile/hooks/journey-mutations.ts`
- `apps/web/src/features/profile/components/ProfileJourney.tsx`
- `apps/web/src/features/profile/components/ProfileTabs.tsx`
- `apps/web/test/profile-journey-contract.test.mjs`

## Implementation Summary

- Added `profileJourney`, `myJourney`, and `myJourneyEntry` route helpers.
- Added profile Journey query key and query hook.
- Added create/delete Journey mutations with targeted cache invalidation.
- Added `ProfileJourney` with loading, error, empty, populated, owner create, and owner delete states.
- Mounted Journey in the profile Diving tab after Dive Map.
- Added static web contract tests confirming shared contract/API consumption and absence of proof/verification claims.

## Verification Commands And Results

- `pnpm --filter @freediving.ph/web type-check`: passed.
- `pnpm --filter @freediving.ph/web test`: failed once due an overbroad test regex, then passed, 205 tests with 14 skipped.
- `pnpm --filter @freediving.ph/web lint`: passed.
- `git diff -- apps/web packages/types`: reviewed.
- `git diff --check`: passed.

## Repairs Attempted

- Repair 1: tightened the Journey UI contract test so the shadcn `Badge` component import is not mistaken for a badge-awarding product claim.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

`.ai/state/decisions.md` was not updated because no new durable project decision was made.

## Risks And Limitations

- Manual edit UI is not exposed yet; backend update exists, but the V1 UI supports create and delete.
- Media attachment UI is not exposed yet; existing attached `mediaIds` can render as counts.
- Tagged-user UI remains deferred with backend tagging.

## Next Phase Readiness

Ready for Phase 7: Generated-Entry Integration Preparation.
