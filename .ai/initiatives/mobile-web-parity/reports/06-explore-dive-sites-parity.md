# 06 Explore And Dive Sites Parity Report

Date: 2026-06-01

Verdict: PASS

## Summary

Mobile Explore now covers the practical user-facing parity slice: list search/filter/sort, visible save/like actions, richer site detail status, condition report submission, suggest-edit submission, my submissions/edit proposal status hooks, and compact community surfaces for presence, affinity, reviews, and related posts. The implementation uses existing shared DTOs and FPHGo routes. It does not treat saved, liked, reviewed, present, or local/regular state as proof of visiting a site.

## Implemented Items

- Added mobile Explore list query params for search, area, difficulty, verified-only, saved-only, and native sort mode.
- Added Explore list controls for search, area filter, difficulty chips, verified/saved chips, recent/popular/default sort, and reset.
- Added mobile API wrappers for related site data, community posts, presence, affinities, reviews, condition updates, edit proposals, and my edit proposals.
- Added authenticated mutations for site condition updates, suggest edits, presence, affinity, and reviews with cache updates.
- Added detail save action, condition report form, suggest-edit form, status fields, buddy/local context, review form/list, and community post previews.
- Added targeted Explore parity tests.
- Ran iOS Simulator smoke against the already-running Expo/Metro session.

## Files Changed

- `apps/mobile/src/features/explore/api/explore-api.ts`
- `apps/mobile/src/features/explore/hooks/use-explore-mutations.ts`
- `apps/mobile/src/features/explore/hooks/use-explore-site-related-query.ts`
- `apps/mobile/src/features/explore/hooks/use-explore-sites-query.ts`
- `apps/mobile/src/features/explore/hooks/use-my-explore-submissions-query.ts`
- `apps/mobile/src/features/explore/screens/explore-screen.tsx`
- `apps/mobile/src/features/explore/screens/explore-site-detail-screen.tsx`
- `apps/mobile/src/lib/query/query-keys.ts`
- `apps/mobile/test/explore-dive-sites-parity.test.mjs`
- `.ai/initiatives/mobile-web-parity/06-explore-dive-sites-parity.md`
- `.ai/initiatives/mobile-web-parity/reports/06-explore-dive-sites-parity.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `docs/mobile-web-parity-assessment.md`

## Verification

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint` PASS
- `xcrun simctl list devices booted` PASS: iPhone 17 Pro Max `2F7FB22A-0FBC-4250-9476-3321249C1131` booted on iOS 26.4.
- `curl -I --max-time 5 http://127.0.0.1:8081/status` PASS: Metro returned 200 for `apps/mobile`.
- `xcrun simctl openurl booted 'freediving-ph-app:///(app)/(tabs)/(home)/explore'` PASS.
- `xcrun simctl io booted screenshot /tmp/fph-ios-explore-06.png` PASS; screenshot showed Explore controls and list content without redbox.
- `xcrun simctl openurl booted 'freediving-ph-app:///(app)/(tabs)/(home)/explore/sardine-run-moalboal'` PASS.
- `xcrun simctl io booted screenshot /tmp/fph-ios-explore-detail-06.png` PASS; screenshot showed real site detail content and actions without redbox.
- `git diff --check` PASS

## Skipped Checks

- Shared type tests skipped because shared contracts were not changed.
- Backend tests skipped because backend code was not changed.
- Android/emulator/device tests skipped by initiative instruction.

## Repairs Attempted

- Attempt 1: Mobile test failed because an existing foundation contract asserted the exact sign-in sentence on Explore detail. Restored the exact sentence and kept the broader member-action copy after it. Rerun passed.

## Unrelated Drift Classification

The worktree already contained prior mobile-web parity changes for initiatives 01-05 and their reports. Those changes were preserved and not reverted.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

No durable product decision was added to `.ai/state/decisions.md`.

## Risks And Limitations

- accepted: Detail save state is backend-authoritative after the user acts, but the current site-detail response does not expose initial `isSaved`. Direct-opened saved sites may initially show `Save` until the user taps it or returns from a list cache. Fixing that exactly requires a backend/shared contract addition and was not necessary for this initiative.
- accepted: Native map remains deferred. List/detail parity is intentionally completed first.
- accepted: Presence, affinity, reviews, saves, and likes are community/social actions only. They do not unlock Dive Map locations or inflate visited-site counts.
- active: Full Explore moderation/admin remains web-only and out of scope.

## Manual Smoke Checklist

- Open Explore and search for `Sardine`.
- Filter by `Easy`, `Verified`, and `Popular`.
- Open `Sardine Run`.
- Like and save/unsave the site.
- Open and validate Report conditions.
- Open and validate Suggest edit.
- Mark presence and add a local/regular link.
- Add a review and confirm it appears.
- Submit a new site and confirm it appears in My submissions as pending review.

## Handoff

Proceed to `07-groups-parity.md`. Groups should reuse the list/detail/action/deep-link patterns already established for profile, media, Chika, messaging, and Explore.
