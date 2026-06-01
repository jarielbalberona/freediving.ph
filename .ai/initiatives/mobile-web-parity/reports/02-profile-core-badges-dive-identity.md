# 02 Profile Core, Badges, And Dive Identity Report

Date: 2026-06-01

Verdict: PASS WITH ISSUES

## Summary

Mobile now has the core profile parity slice needed before media deep links: own and public profile screens expose read-only badges and compact Dive identity summaries using shared backend contracts. The implementation preserves the proof-based Dive Map rule by reading visited-site count from Passport/Dive Map data only, not from Dive Memories.

Own profile editing now includes backend-supported identity fields: display name, avatar URL, bio, home area/location, certification, and interests. The local draft path was widened so every exposed edit field is preserved instead of saving only name/bio.

## Implemented Items

- Added mobile profile API calls for public badges, Dive Map, Passport, Journey, and Dive Memories.
- Added React Query keys and hooks for those public profile-experience surfaces.
- Added read-only badge showcase component.
- Added compact Dive identity summary with proof-based source-of-truth copy and counts.
- Added Badges tab to mobile profile tabs.
- Rendered compact Dive identity summaries on own and public profiles.
- Extended own profile editing to backend-supported avatar URL, home area/location, certification, and interests.
- Added focused mobile tests for shared contracts, read-only badge rendering, proof-based count handling, and profile edit payload coverage.

## Files Changed

- `apps/mobile/src/features/profiles/api/profiles-api.ts`
- `apps/mobile/src/features/profiles/hooks/use-profile-activity-query.ts`
- `apps/mobile/src/features/profiles/screens/profile-screen.tsx`
- `apps/mobile/src/features/profiles/screens/public-profile-screen.tsx`
- `apps/mobile/src/features/profiles/components/profile-badges-section.tsx`
- `apps/mobile/src/features/profiles/components/profile-dive-identity-summary.tsx`
- `apps/mobile/src/features/profiles/components/profile-tabs.tsx`
- `apps/mobile/src/lib/query/query-keys.ts`
- `apps/mobile/test/profile-core-parity.test.mjs`
- `.ai/initiatives/mobile-web-parity/02-profile-core-badges-dive-identity.md`
- `.ai/state/current-state.md`
- `docs/mobile-web-parity-assessment.md`

## Verification

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile ios` BLOCKED by local iOS dependency/toolchain setup already observed during initiative 01: Expo attempted CocoaPods installation, `gem install cocoapods --no-document` exited non-zero, and fallback Homebrew install failed with `spawn brew ENOENT`.
- `git diff --check` PASS

## Remaining Gaps

- Cover image editing is not implemented because no clear mobile-safe shared update contract was found for cover media/photo in the profile DTO used by mobile.
- Badge management remains web/management scope.
- Full native map, Journey writes, Passport settings, and Dive Memories management remain out of scope.
- Runtime iOS Simulator smoke is pending until local CocoaPods/Homebrew tooling is fixed.

## Manual Smoke Checklist

- Open own profile and confirm header, posts, Badges tab, Diving tab, and Dive identity summary render.
- Edit display name, avatar URL, bio, home area, certification, and interests; save and reload.
- Open another public profile and confirm badges and Dive identity summary render or show honest empty states.
- Confirm memories are described as contextual and do not unlock locations.
- Confirm other-user profile has no own-profile edit controls.

## Handoff

Proceed to `03-media-posts-comments-deep-links.md`. The profile media grid and public profile route can now deep-link into a first-class mobile media detail screen without waiting on profile identity work.
