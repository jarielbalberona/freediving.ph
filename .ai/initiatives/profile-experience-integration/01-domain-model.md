# Profile Experience Integration Domain Model

## Core Principle

The profile experience is a composed product surface with four distinct ownership layers:

- Profile Badges: achievement/credential/stat layer.
- User Dive Map: proof/location layer.
- Dive Journey: social/storytelling timeline layer.
- Dive Passport: public aggregate/showcase layer.

Integration must make these modules work together without blurring source-of-truth ownership.

## Profile Badges

Existing implementation surfaces:

- Backend: `services/fphgo/internal/features/profiles`.
- Shared contracts: `packages/types/src/api/badges.ts`.
- Web: `apps/web/src/features/profile/components/ProfileBadges.tsx` and `apps/web/src/features/profile/pages/BadgeManagementPage.tsx`.

Important existing concepts:

- `BadgeCategory`: `personal_best | certification | experience | auto_stat`.
- `BadgeSourceModule`: includes `profile`, `dive_map`, `courses`, `events`, `schools`, `system`, `admin`.
- `UserBadgeSourceType`: includes `manual`, `profile`, `dive_map`, `course`, `event`, `school`, `system`, `admin`.
- `UserBadgeVisibility`: `public | private`.
- Current Profile Badges service documents `BadgeJourneyEventPayload` as a future Journey integration payload.
- Current Dive Sites Visited auto stat is transitional and must move to `user_dive_sites` as the final source.

Rules:

- Profile Badges own badge templates, user badges, PBs, certifications, roles, verification status, and auto stats.
- Profile Badges must not create competing dive-site truth.
- Dive Sites Visited auto stat must align with `user_dive_sites`.
- Map-based future badges must source from `user_dive_sites`, not memories.
- Badge events may feed Journey display, but Journey must not award or verify badges.

## User Dive Map

Source initiative: `.ai/initiatives/user-dive-map/`.

Rules:

- Dive Map is the proof/location layer.
- `user_dive_sites` is the source of truth for unlocked visited dive sites.
- A user unlocks a site only through a qualifying user-owned `media_posts` record tagged to `dive_site_id`.
- Shared/tagged memories do not unlock locations.
- Shared/tagged memories do not inflate visited-site counts.
- Map-based badge and Journey integrations consume `user_dive_sites`.

## Dive Journey

Source initiative: `.ai/initiatives/dive-journey/`.

Rules:

- Dive Journey is the social/storytelling timeline layer.
- Journey is downstream.
- Journey may consume memories, map milestones, badge additions, media activity, and manual entries.
- Journey must not unlock locations.
- Journey must not increase visited-site counts.
- Journey must not award badges.
- Journey must not verify certifications or credentials.
- Generated entries use `source_type` and `source_id` for idempotency and duplicate prevention.

## Dive Passport

Source initiative: `.ai/initiatives/dive-passport/`.

Rules:

- Dive Passport is the public aggregate/showcase layer.
- Passport is a composed read model / presentation layer.
- Passport must not mutate badges, map, journey, profile source data, media, memories, or stats.
- Passport must not duplicate source data.
- Passport must gracefully handle missing/empty modules.
- Passport must enforce child resource visibility.

## Integrated Profile Surface

The public profile must present these modules as one coherent experience.

Rules:

- Owner and public viewer behavior must be explicit and consistent.
- Passport can summarize other modules, but must not make standalone module sections contradictory or redundant.
- The execution phase must decide whether Passport is a tab, section, or standalone route based on existing profile conventions or hard-stop for product input.
- Empty states must not imply verified absence of activity when a source module is missing or not implemented.

## Forbidden Integration Patterns

- A `dive_passports` table that duplicates source data.
- Journey rows creating map ownership.
- Passport settings mutating source visibility or stats.
- Badge auto stats counting memories or shared/tagged content.
- Client-side recomputation of proof, badges, Journey source state, or Passport stats.
- Reverse dependencies from Map/Journey/Badges into Passport.
