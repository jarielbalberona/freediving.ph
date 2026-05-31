# Phase 9 Report: Web UI And Management Surfaces

## Status

passed

## Summary

Phase 9 added a bounded web surface for Dive Memories. Public profile viewers can see visible memories. Profile owners can create, edit, and delete their own memories. The UI also exposes an owner-only tagged-request count as the safe V1 fallback instead of inventing a full tagged-memory inbox workflow beyond the locked initiative.

## Files Changed

- `apps/web/src/lib/api/fphgo-routes.ts`
- `apps/web/src/lib/query/query-keys.ts`
- `apps/web/src/features/profiles/api/profiles.ts`
- `apps/web/src/features/profile/api/profileApi.ts`
- `apps/web/src/features/profile/hooks/queries.ts`
- `apps/web/src/features/profile/hooks/memory-mutations.ts`
- `apps/web/src/features/profile/components/ProfileDiveMemories.tsx`
- `apps/web/src/features/profile/components/ProfileTabs.tsx`
- `apps/web/test/profile-dive-memories-contract.test.mjs`
- `apps/web/test/profile-dive-map-contract.test.mjs`
- `apps/web/test/profile-passport-contract.test.mjs`
- `.ai/initiatives/dive-memories/phases/phase-9-web-ui-and-management-surfaces.md`
- `.ai/initiatives/dive-memories/phases/phase-10-final-verification-reporting.md`
- `.ai/initiatives/dive-memories/reports/phase-9-web-ui-and-management-surfaces.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Implementation Evidence

- Added profile-scoped Dive Memories route helpers and API client methods.
- Added React Query keys for profile memories, owner memories, and owner tag requests.
- Added owner create/update/delete memory mutations that invalidate downstream display reads only: memories, map details, Journey, and Passport.
- Added `ProfileDiveMemories` to the profile Diving tab after Journey.
- Added owner memory form with title, dive site id, body, and visibility.
- Added inline owner edit/delete controls.
- Added owner-only tagged-request count fallback. Pending/declined/hidden tag details are not exposed publicly.
- Updated Dive Map static contract to match the locked Dive Memories rule: marker detail may display memories, but markers and counts remain proof-based.

## Verification Results

### Verification Summary

- Commands run: 7
- Passed: 7
- Failed then repaired or resolved before final verification: 2
- Skipped: 0

### Exact Commands Run

- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" pnpm --filter @freediving.ph/web type-check`
  - Initial result: failed due unrelated pre-existing web type drift.
  - Initial failure evidence:
    - `src/features/payments/components/PaymentMethodsSetup.tsx(400,37): Property 'then' does not exist on type 'void | Promise<void>'.`
    - `src/features/schools/pages/ManageSchoolsPage.tsx(462,30): Type 'Promise<CoursePaymentMethod>' is not assignable to type 'void | Promise<void>'.`
    - `src/features/schools/pages/ManageSchoolsPage.tsx(464,11): Type 'Promise<CoursePaymentMethod>' is not assignable to type 'void | Promise<void>'.`
  - Final result: pass after the working tree's unrelated drift was corrected.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" pnpm --filter @freediving.ph/web test`
  - Initial result: failed due unrelated management school route contract drift plus a now-obsolete Dive Map static assertion.
  - Repair: updated `profile-dive-map-contract.test.mjs` to match the locked Phase 7 rule allowing marker memory previews after proof-backed marker gating.
  - Final result: pass after the working tree's unrelated management route drift was corrected.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" pnpm --filter @freediving.ph/web exec node --test test/profile-dive-memories-contract.test.mjs test/profile-dive-map-contract.test.mjs test/profile-passport-contract.test.mjs test/profile-journey-contract.test.mjs test/profile-diving-tabs-contract.test.mjs`
  - Result: pass
  - Evidence: 17 focused profile tests passed.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" pnpm --filter @freediving.ph/web lint`
  - Result: pass
  - Evidence: Biome checked 882 web files with no lint failures.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" pnpm --filter @freediving.ph/web test`
  - Final result: pass
  - Evidence: 214 web tests ran; 200 passed and 14 were skipped.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" pnpm --filter @freediving.ph/types type-check`
  - Result: pass
  - Evidence: `tsc --noEmit` completed.
- `PATH="/opt/homebrew/bin:/usr/local/bin:$PATH" git diff --check`
  - Result: pass

## Source-Of-Truth Boundary Evidence

- The web UI labels memories as memories only and does not claim proof, unlocks, badges, credentials, or visited-site counts.
- Owner mutations call memory endpoints only. They invalidate downstream display reads but do not mutate Dive Map, Journey, Passport, or Badge APIs directly.
- Dive Map UI still displays proof count from marker `mediaPostCount`.

## Risks And Limitations

- resolved: Initial full web type-check and full web test drift were corrected before final initiative verification.
- accepted: Tagged-memory management is a safe V1 count/fallback, not a full acceptance workflow UI.

## Next Phase Readiness

Ready for Phase 10 Final Verification/Reporting.
