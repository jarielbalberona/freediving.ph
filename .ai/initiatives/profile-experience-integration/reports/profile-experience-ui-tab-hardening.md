# Profile Experience UI Tab Hardening Report

## Status

passed

## Summary

Implemented a focused UI/UX hardening pass over the completed profile experience modules. The profile now exposes source-owned modules as separate tabs: Posts, Badges, Diving, Dive Map, Dive Journey, and Dive Passport. Dive Memories are no longer presented as a top-level profile section; they remain contextual stories inside selected proof-backed Dive Map entry details.

## Files Changed

- `apps/web/src/features/profile/pages/ProfilePage.tsx`
- `apps/web/src/features/profile/components/ProfileTabs.tsx`
- `apps/web/src/features/profile/components/ProfileDiveMap.tsx`
- `apps/web/test/profile-diving-tabs-contract.test.mjs`
- `apps/web/test/profile-dive-map-contract.test.mjs`
- `apps/web/test/profile-dive-memories-contract.test.mjs`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `.ai/state/decisions.md`
- `.ai/initiatives/profile-experience-integration/reports/profile-experience-ui-tab-hardening.md`

## Profile Tab Structure

1. Posts
2. Badges
3. Diving
4. Dive Map
5. Dive Journey
6. Dive Passport

## Dive Map Rendering Strategy

The Dive Map tab uses the existing `MapProvider` and `@vis.gl/react-google-maps` integration already used by Explore. It does not hardcode secrets. If no Google Maps API key is configured, the existing provider fallback renders a safe unavailable state. If unlocked dive sites lack coordinates, the tab renders a provider-neutral placeholder plus marker cards.

## Dive Memories Access Model

Dive Memories are accessed inside selected Dive Map site details through the existing `ProfileDiveMapSiteResponse.memories` data. The selected entry still comes from the proof-backed Dive Map read model. Memories do not create markers, unlock sites, inflate counts, award badges, or verify credentials.

## Verification Summary

- Commands run: 4
- Passed: 4
- Failed then repaired: 1
- Skipped: backend/shared checks because no backend or shared contract behavior changed.

## Exact Commands Run

- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" pnpm --filter @freediving.ph/web exec node --test test/profile-diving-tabs-contract.test.mjs test/profile-dive-map-contract.test.mjs test/profile-dive-memories-contract.test.mjs test/profile-passport-contract.test.mjs test/profile-journey-contract.test.mjs`
  - Result: pass
  - Evidence: 17 focused profile tests passed.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" pnpm --filter @freediving.ph/web type-check`
  - Initial result: failed on two local issues:
    - `ProfileDiveMap.tsx`: direct `mapTypeId` prop was not accepted by the map component type.
    - `ProfileTabs.tsx`: `ProfilePostsTab` prop type still included newly added badge props.
  - Repair: removed the direct `mapTypeId` prop and excluded `badges`/`autoStats` from the posts-tab prop type.
  - Final result: pass.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" pnpm --filter @freediving.ph/web lint`
  - Result: pass
  - Evidence: Biome checked 876 files with no lint failures.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" git diff --check`
  - Result: pass.

## Source-Of-Truth Boundary Confirmation

- Posts remains the raw media/content stream.
- Badges tab uses existing Profile Badges data and behavior.
- Diving tab uses existing profile diving presence and dive-site affinity data.
- Dive Map markers come from the existing Dive Map/user_dive_sites read model.
- Dive Map selected-entry detail shows proof media plus visible memories.
- Dive Memories are contextual to a Dive Map entry and are not used as proof.
- Journey remains storytelling/downstream.
- Passport remains read-only presentation.

## Risks And Limitations

- accepted: The profile Dive Map uses Google Maps only when existing environment configuration is present; otherwise it falls back safely.
- accepted: The profile Dive Map is stable and data-correct, but visual map polish can be improved later.
- active: Dive Memories owner create/edit UX still exists in code but is no longer mounted as a top-level profile tab. Future placement should be decided intentionally, likely inside map-entry management.

## Decisions Updated

Updated `.ai/state/decisions.md` with the durable decision that profile experience modules use separate top-level tabs and Dive Memories are contextual Dive Map entry stories.
