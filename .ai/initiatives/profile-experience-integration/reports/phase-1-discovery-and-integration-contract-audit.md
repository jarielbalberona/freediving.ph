# Phase 1 Report: Discovery And Integration Contract Audit

Date: 2026-05-31

## Verdict

PASS

## Files Reviewed

- `.ai/initiatives/user-dive-map/**`
- `.ai/initiatives/dive-journey/**`
- `.ai/initiatives/dive-passport/**`
- `.ai/initiatives/profile-experience-integration/**`
- `services/fphgo/internal/features/profiles/service/service.go`
- `services/fphgo/internal/features/profiles/service/badges_test.go`
- `services/fphgo/internal/features/profiles/repo/repo.go`
- `services/fphgo/internal/features/profiles/repo/badges_contract_test.go`
- `services/fphgo/internal/features/dive_map/**`
- `services/fphgo/internal/features/dive_journey/**`
- `services/fphgo/internal/features/dive_passport/**`
- `packages/types/src/api/badges.ts`
- `packages/types/src/api/profile-view.ts`
- `packages/types/src/api/dive-journey.ts`
- `packages/types/src/api/dive-passport.ts`
- `apps/web/src/features/profile/pages/ProfilePage.tsx`
- `apps/web/src/features/profile/components/ProfileBadges.tsx`
- `apps/web/src/features/profile/components/ProfileDiveMap.tsx`
- `apps/web/src/features/profile/components/ProfileJourney.tsx`
- `apps/web/src/features/profile/components/ProfilePassport.tsx`
- `apps/web/src/features/profile/components/ProfileTabs.tsx`

## Module Status

- Profile Badges: implemented in the profiles feature. Public badge reads filter private badges, manual badge writes validate owned proof media, and the Dive Sites Visited auto stat calls repository count helpers.
- User Dive Map: implemented as proof-based profile map reads backed by `user_dive_sites`; marker detail returns target-owned qualifying proof media only.
- Dive Journey: implemented with read/write APIs, generated-entry helpers, owner manual entries, visibility handling, and display-only downstream semantics.
- Dive Passport: implemented as a read-only aggregate with presentation-only settings and web profile UI.
- Dive Memories: not implemented; shared/tagged memory privacy remains deferred and must not be used as profile truth.

## Ownership Map

- Dive Map owns visited-site truth through `user_dive_sites`.
- Profile Badges own badge templates, user badges, badge verification/status fields, and auto-stat presentation.
- Dive Journey owns storytelling/timeline entries and downstream generated display rows.
- Dive Passport owns aggregate presentation only; it reads profile, map, badges, Journey, media fallback, and deferred memories state.
- Public profile UI composes the modules; it must not calculate source truth in the browser.

## Current UI Composition

- `ProfilePage` renders `ProfileBadges` above `ProfileTabs`.
- The Diving tab renders `ProfilePassport`, then `ProfileDiveMap`, then `ProfileJourney`, followed by Dive Presence and Dive Sites sections.
- Owner controls are passed through `isOwner` from `viewerRelationship.isSelf`.
- Passport settings are owner-only and presentation-only.

## Risks Found

- Repo-level dirty worktree contains unrelated mobile Expo dependency drift:
  - `apps/mobile/package.json`
  - `pnpm-lock.yaml`
- Full repo `pnpm test` is already known to fail because that drift changes `@expo/ui` to `~56.0.15` while the mobile foundation contract expects `~56.0.14`.
- Dive Memories remain a deferred product gap; integrating shared/tagged memories into map, Journey, Passport, or counts would still require a separate locked privacy/tagging initiative.
- Public profile composition is dense: Profile Badges plus Passport badge summary plus Dive Map/Journey sections can become redundant. This is an integration UX risk, not a blocker.

## Verification

Passed:

- `git status --short`
- `rg "badge|badges|user_dive_sites|dive_journey|dive_passport|visibility|source_type|source_id" services/fphgo packages/types apps/web/src .ai/initiatives`
- `find services/fphgo/internal/features -maxdepth 2 -type d | sort`
- `find apps/web/src/features/profile -maxdepth 3 -type f | sort`

## Hard Stops

None.

No conflicting locked specifications, source-of-truth ambiguity, or immediate privacy ambiguity blocked Phase 2.
