# 02 Profile Core, Badges, And Dive Identity

Status: Ready After Previous
Ready for execution: yes
Execution started: no
Dependency gate: execute automatically after `01-auth-onboarding-account-setup.md` has a terminal passing status.
PASS criterion: mobile profile exposes core identity, read-only badges, and compact dive identity summaries without mutating child source systems.

## Readiness Rationale

This is sequence-gated, not blocked. Required profile experience, badge, Dive Map, Journey, Passport, and Dive Memories source-of-truth work exists in the repository state; implementation should proceed after onboarding/account setup is complete.

## 1. Purpose

Bring mobile profile identity close to web parity for the user-facing surfaces that define a diver: profile header, editable basics, badge showcase, and compact Dive Map/Journey/Passport/Memories summaries.

## 2. Scope

- Public profile header improvements.
- Own profile edit improvements.
- Avatar/cover support if backend/contracts exist.
- Basic diving identity fields if supported.
- Read-only badge showcase.
- Compact Dive Passport, Dive Journey, Dive Map, and Dive Memories summary.
- Profile tabs/sections.
- Privacy, blocked, incomplete states if already supported by backend.

## 3. Explicit Non-Goals

- Full badge management.
- Full native map.
- Buddy relationship implementation beyond showing existing relationship state if present.
- Schools, events, groups, admin.

## 4. Dependencies

- `01-auth-onboarding-account-setup.md`
- Completed `user-dive-map`, `dive-journey`, `dive-passport`, `profile-experience-integration`, and `dive-memories` initiatives.

## 5. Files And Areas Likely Involved

- `apps/mobile/src/features/profiles/**`
- `apps/mobile/src/features/media/hooks/use-profile-media-query.ts`
- `apps/mobile/app/(app)/(tabs)/profile/**`
- `apps/mobile/app/(app)/(tabs)/(home)/profile/**`
- `packages/types/src/api/badges.ts`
- `packages/types/src/api/dive-passport.ts`
- `packages/types/src/api/dive-journey.ts`
- `packages/types/src/api/dive-memories.ts`
- `packages/types/src/api/profile-view.ts`

## 6. Existing Web Source Of Truth

- `apps/web/src/app/[username]/page.tsx`
- `apps/web/src/app/[username]/settings/page.tsx`
- `apps/web/src/features/profile/components/ProfileBadges.tsx`
- `ProfileDiveMap.tsx`, `ProfileJourney.tsx`, `ProfilePassport.tsx`, `ProfileDiveMemories.tsx`
- `apps/web/src/features/profile/pages/ProfilePage.tsx`

## 7. Existing Mobile Implementation Status

Mobile has profile/public-profile screens, posts tab, diving tab, media grid, derived dive-site highlights, and display-name/bio editing.

## 8. Backend/Shared Contract Status

Badge, Passport, Journey, Dive Map, and Dive Memories contracts exist in shared packages and backend features. Use read APIs; do not invent mobile aggregates.

## 9. Implementation Steps

1. Add profile tabs/sections for identity, posts, badges, diving, and compact dive identity summaries.
2. Wire read-only badge and profile-experience queries.
3. Add owner edit support for backend-supported avatar/cover/basic identity fields.
4. Render blocked/private/incomplete states from backend payloads.
5. Add focused component/hook tests.

## 10. Role/Auth/Privacy Rules

Owner-only edit actions must require authenticated owner state. Public, member, private, blocked, and visibility states must come from backend responses.

## 11. UX Rules For Native Mobile

Use compact scroll sections/tabs. Do not copy desktop dense profile layouts. Avoid huge nested cards.

## 12. Data/Source-Of-Truth Rules

Dive Map is proof-based. A user unlocks/owns a location only through their own qualifying media post tagged to that dive site. Tagged/shared memories alone must not unlock locations or inflate visited-site counts. Passport is read-only aggregation, Journey is downstream storytelling, Badges own achievements/credentials, and Memories are social/contextual.

## 13. Implementation Guards

- Stop if any UI would derive visited-site count from memories/Journey/Passport.
- Stop if mobile needs badge management product rules not in the contract.
- Stop if avatar/cover upload ownership rules are unclear.

## 14. Acceptance Criteria

- Public profile shows improved header, posts, badges, and compact dive identity summaries.
- Own profile can edit supported core fields.
- Empty/private/blocked states are explicit.
- No child source system is mutated by summary display.

## 15. Verification Commands

- `pnpm --filter @freediving.ph/mobile test`
- `pnpm --filter @freediving.ph/mobile type-check`
- `pnpm --filter @freediving.ph/types test` if contracts change
- `git diff --check`

### iOS Simulator Smoke Test

Required when this initiative changes mobile UI/navigation/runtime behavior.

Suggested flow:
1. Launch the mobile app in an iOS Simulator using the repo-supported command.
2. Confirm the app opens without redbox/runtime crash.
3. Navigate to each screen changed by this initiative.
4. Confirm loading, empty, error, and success states where practical.
5. Confirm primary actions open the expected sheet/screen/form.
6. Confirm back navigation works.
7. Confirm there are no obvious layout breaks on a standard iPhone simulator.
8. Record simulator/device, command used, result, and any runtime errors.

If simulator testing cannot be run, document the blocker and include a manual checklist.

## 16. Manual Smoke Checklist

- Open own profile and another public profile.
- Confirm badges and dive identity summaries render or show honest empty states.
- Confirm private/blocked profile behavior.
- Confirm profile edits persist and reload.

## 17. Rollback/Risk Notes

Rollback mobile profile UI/hook changes. Risk is source-of-truth corruption if counts are derived client-side; do not do that.

## 18. Handoff Notes For The Next Initiative

`03-media-posts-comments-deep-links.md` can build on the profile media grid and route media items into first-class detail screens.
