# 06 Explore And Dive Sites Parity

Status: passed
Ready for execution: yes
Execution started: yes
Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.
PASS criterion: mobile Explore supports practical list/detail parity, user actions, submissions/status, and contribution flows without violating proof-based Dive Map rules.
Latest execution result: PASS on 2026-06-01. Mobile Explore now has native search/filter/sort controls, save/like visible actions, detail status sections, condition report submission, suggest-edit submission, presence/affinity/review surfaces, related/community previews, my submissions/edit proposal status hooks, targeted mobile tests, and successful iOS Simulator smoke on iPhone 17 Pro Max.

## Readiness Rationale

This is sequence-gated, not blocked. Explore list/detail/submission support already exists on mobile; parity can proceed using existing backend/shared contracts, while preserving proof-based Dive Map rules.

## 1. Purpose

Make mobile Explore useful enough to replace web for normal dive-site discovery and contribution flows.

## 2. Scope

- Dive site list search/filter/sort.
- Site cards and loading/error/empty states.
- Site detail improvements.
- Save/unsave and like/unlike.
- Site updates/reports if backend supports.
- Suggest edit if supported.
- Submit new site.
- My submissions/status.
- Presence/affinity actions if supported.
- Reviews if supported.
- Related sites, community media, buddy intents if supported and reasonable.
- Native map only if explicitly ready after list/detail parity.

## 3. Explicit Non-Goals

- Explore admin/moderation unless a separate initiative includes it.
- Map-first implementation while list/detail parity is incomplete.
- Bypassing proof-based Dive Map rules.

## 4. Dependencies

- `01-auth-onboarding-account-setup.md`
- `05-messaging-notifications-buddy-relationships.md` if buddy-intent message entry is included.

## 5. Files And Areas Likely Involved

- `apps/mobile/src/features/explore/**`
- `apps/mobile/app/(app)/(tabs)/(home)/explore*.tsx`
- `apps/web/src/features/diveSpots/api/explore-v1.ts`
- `apps/web/src/app/explore/**`
- `packages/types/src/index.ts`
- `services/fphgo/internal/features/explore/**`

## 6. Existing Web Source Of Truth

- `apps/web/src/app/explore/page.tsx`
- `apps/web/src/app/explore/sites/[slug]/page.tsx`
- `apps/web/src/app/explore/submit/page.tsx`
- `apps/web/src/app/explore/sites/[slug]/suggest-edit/page.tsx`
- `apps/web/src/app/explore/submissions/**`
- `apps/web/src/app/explore/updates/page.tsx`
- `apps/web/src/features/diveSpots/api/explore-v1.ts`

## 7. Existing Mobile Implementation Status

Mobile has Explore list, detail, and submit form plus some save/like hooks. It lacks full search/filter/sort, my submissions/status, suggest-edit UI, richer detail sections, and most contribution actions.

## 8. Backend/Shared Contract Status

Explore APIs cover sites, detail, submissions, edit proposals, likes, saves, presence, affinity, reviews, updates, community posts, related sites, and buddy intents.

## 9. Implementation Steps

1. Improve list query state, filters, sort, and empty/error states.
2. Surface save/like actions on cards/detail.
3. Add detail sections for supported updates, buddy intents, related/community content, reviews, presence, and affinity.
4. Add submit/suggest-edit/my-submissions flows.
5. Add report/update submission only if contracts are clear.
6. Add tests for hooks and screen states.

## 10. Role/Auth/Privacy Rules

Guests may browse public sites. Mutations require auth. Moderator-only/admin states stay out of this initiative.

## 11. UX Rules For Native Mobile

Prefer fast list/detail, chips, and compact contribution sheets. Native map is secondary unless explicit readiness is documented.

## 12. Data/Source-Of-Truth Rules

Explore actions do not unlock profile Dive Map entries. Dive Map unlocks only from the user's own qualifying media post tagged to the dive site.

## 13. Implementation Guards

- Stop if a UI would imply a saved/liked/visited site is proof of visiting.
- Stop if update/report/suggest-edit contracts are ambiguous.
- Do not expose moderation actions.

## 14. Acceptance Criteria

- Users can search/filter/sort sites.
- Detail shows supported user-facing sections.
- Save/like and contribution flows work with backend state.
- My submissions/status is visible to submitters.

## 15. Verification Commands

- `pnpm --filter @freediving.ph/mobile test`
- `pnpm --filter @freediving.ph/mobile type-check`
- `pnpm --filter @freediving.ph/types test` if contracts change
- Backend tests only if backend changes
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

- Search/filter sites.
- Open detail.
- Save/unsave, like/unlike.
- Submit site and view status.
- Suggest edit and confirm status where available.

## 17. Rollback/Risk Notes

Rollback Explore mobile changes. Risks are confusing "visited" with saved/liked/presence and exposing moderator data.

## 18. Handoff Notes For The Next Initiative

Groups can reuse profile, media, and deep-link patterns established earlier.
