# Phase 5: Web Profile Dive Map UI

Final status: passed

## Summary

Rendered the profile Dive Map using backend-provided state and shared contracts.

The UI lives inside the existing profile Diving tab, reads marker state from the Phase 4 APIs, and opens a selected-site proof media panel from the marker detail API. It does not calculate unlock state in the browser and does not include Dive Memories, shared/tagged content, manual visits, badges, Journey, or Passport behavior.

## Changes

- Added profile Dive Map route helpers in `apps/web/src/lib/api/fphgo-routes.ts`.
- Added React Query keys for marker list and marker detail reads.
- Added profile API client methods and profile hooks for Dive Map reads.
- Added `ProfileDiveMap` component with loading, error, empty, populated marker list, and proof-media detail states.
- Mounted the component in the existing profile Diving tab.
- Added a web contract test proving the UI consumes server contracts/proof APIs and does not reference memories or manual visits.

## Files Changed

- `.ai/initiatives/user-dive-map/phases/phase-5-web-profile-dive-map-ui.md`
- `.ai/initiatives/user-dive-map/reports/phase-5-web-profile-dive-map-ui.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `apps/web/src/features/profile/api/profileApi.ts`
- `apps/web/src/features/profile/components/ProfileDiveMap.tsx`
- `apps/web/src/features/profile/components/ProfileTabs.tsx`
- `apps/web/src/features/profile/hooks/queries.ts`
- `apps/web/src/features/profiles/api/profiles.ts`
- `apps/web/src/lib/api/fphgo-routes.ts`
- `apps/web/src/lib/query/query-keys.ts`
- `apps/web/test/profile-dive-map-contract.test.mjs`

## Verification Commands And Results

- `pnpm --filter @freediving.ph/web type-check`: passed.
- `pnpm --filter @freediving.ph/web test`: passed, 203 tests with 14 skipped.
- `pnpm --filter @freediving.ph/web lint`: passed.
- `git diff -- apps/web packages/types`: reviewed scoped frontend/types diff.
- `git diff --check`: passed.

## Repairs Attempted

No repair loop was needed after the Phase 5 implementation.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

`.ai/state/decisions.md` was not updated because no new durable product decision was made.

## Risks And Limitations

- The V1 web map is a profile section/list presentation, not a full geographic map canvas. It stays within available contracts and avoids adding map-provider requirements during this phase.
- Proof media detail intentionally shows only the qualifying media metadata exposed by the backend.
- Further visual polish belongs to hardening phases, not expanded Phase 5 scope.

## Next Phase Readiness

Ready for Phase 6: Map Read Model Hardening.
