# 22 Profile Tabs Parity Correction Report

Final status: PASS
Date: 2026-06-01

## Summary

The previous mobile profile implementation was not true 1:1 tab parity. It loaded profile-experience contracts and showed a compact identity summary, but the actual mobile tab surface only exposed Posts, Badges, and Diving. That was incomplete.

This correction aligns web and mobile profile tabs around the same source-owned order:

1. Posts
2. Badges
3. Diving
4. Dive Map
5. Dive Journey
6. Dive Passport

The tab controls are icon-only by product direction. Accessible labels remain through `aria-label`, `title`, screen-reader text on web, and `accessibilityLabel` plus selected tab state on mobile.

## Web Source Of Truth Found

- Profile page layout and data loading: `apps/web/src/features/profile/pages/ProfilePage.tsx`
- Profile tab owner: `apps/web/src/features/profile/components/ProfileTabs.tsx`
- Posts tab: `ProfileGrid` with existing profile media pagination props.
- Badges tab: `ProfileBadges` using shared badge contracts.
- Diving tab: `ProfileDivingTab` using `ProfileDivingResponse`.
- Dive Map tab: `ProfileDiveMap` using proof-backed profile map reads and selected-site detail.
- Dive Journey tab: `ProfileJourney` using profile Journey reads and owner-only custom entry controls.
- Dive Passport tab: `ProfilePassport` using the read-only Passport aggregate plus owner presentation settings.

## Changes

- Updated web profile tabs to use icon-only Lucide tab controls while keeping query-string tab behavior and the existing tab order.
- Expanded mobile `ProfileTab` from three values to the same six values used by web.
- Updated mobile tab selector to horizontal icon-only native controls using the existing `@expo/vector-icons/Ionicons` dependency.
- Added mobile profile-experience read sections for:
  - Dive Map: proof-backed visited-site list, proof post counts, and Explore deep links.
  - Dive Journey: visible journey entries with dates, visibility, and media counts.
  - Dive Passport: aggregate stats plus map, badge, journey, media, and memory preview sections.
- Wired the new mobile sections into both own profile and public profile screens.
- Updated web and mobile contract tests to pin icon tab behavior and mobile six-tab content parity.

## Files Changed

- `apps/web/src/features/profile/components/ProfileTabs.tsx`
- `apps/web/test/profile-diving-tabs-contract.test.mjs`
- `apps/mobile/src/features/profiles/components/profile-tabs.tsx`
- `apps/mobile/src/features/profiles/components/profile-experience-sections.tsx`
- `apps/mobile/src/features/profiles/screens/profile-screen.tsx`
- `apps/mobile/src/features/profiles/screens/public-profile-screen.tsx`
- `apps/mobile/test/profile-core-parity.test.mjs`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `docs/mobile-web-parity-assessment.md`
- `docs/mobile-web-parity-seeded-qa.md`
- `.ai/initiatives/mobile-web-parity/reports/17-final-parity-audit-and-release-gate.md`
- `.ai/initiatives/mobile-web-parity/reports/22-profile-tabs-parity-correction.md`

## API And Contracts Used

- `ProfileBadgesResponse`
- `ProfileDivingResponse`
- `ProfileDiveMapResponse`
- `ProfileJourneyResponse`
- `ProfilePassportResponse`
- Existing mobile profile activity hooks in `apps/mobile/src/features/profiles/hooks/use-profile-activity-query.ts`
- Existing mobile API calls in `apps/mobile/src/features/profiles/api/profiles-api.ts`

No backend routes or shared DTOs were added. That is the right call. The backend already exposed the needed profile-experience contracts; the bug was presentation parity.

## Verification

Passed: 6

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`
  - Result: pass.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/web type-check`
  - Result: pass.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test -- test/profile-core-parity.test.mjs`
  - Result: pass. The script ran the mobile test suite and passed 69 tests.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/web test -- test/profile-diving-tabs-contract.test.mjs`
  - Result: pass. The script ran the web test suite and passed 200 tests with 14 skipped fphgo smoke tests.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`
  - Result: pass. Biome checked 260 files.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/web lint`
  - Result: pass. Biome checked 876 files.

Failed: 0

Skipped: 2

- Browser smoke for web icon tabs.
  - Reason: focused code-wise correction; no dev server/browser pass was run.
  - Impact: visual runtime fit is not directly proven in browser.
- iOS Simulator smoke for mobile icon tabs.
  - Reason: focused code-wise correction; no device/simulator pass was run.
  - Impact: native runtime rendering is not directly proven in simulator.

## Repairs Attempted

- Attempt 1: Initial shell checks failed because `pnpm` was not on the default shell PATH.
  - Repair made: reran verification with `/opt/homebrew/bin/pnpm`, matching known local PATH drift.
  - Result: type-check, tests, and lint passed.

## Risks And Limitations

- resolved: Mobile profile tab parity no longer stops at compact identity summaries; the profile tab surface now matches web order and renders real data.
- accepted: Profile tabs are icon-only by product direction. Accessibility labels are present, but no assistive-technology smoke was run.
- accepted: Mobile Dive Map is a native proof-backed list/summary, not a native map canvas. That is consistent with current mobile risk posture and avoids adding map runtime infrastructure without a locked requirement.
- accepted: Mobile does not add owner write workflows for Journey, Dive Memories, or Passport settings in this correction. Those remain future explicit product decisions.

## Unrelated Drift Classification

Existing dirty worktree changes were present before this correction, including mobile-web parity QA reports/state, school management QA fixes, dev seed updates, and buddy SQL/sqlc changes from report 21. They were preserved and not reverted.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Decisions

No durable project decision file update was made. The icon-only tab behavior came from the current user correction, not a broader architecture/product decision requiring `.ai/state/decisions.md`.

## Next Phase Readiness

No further mobile-web parity implementation phase is opened by this correction. Normal release process still needs staging/prod config review and device/store QA outside the parity initiative.
