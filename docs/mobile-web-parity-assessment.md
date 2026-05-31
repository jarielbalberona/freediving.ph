# Mobile-Web Parity Assessment

Date: 2026-06-01  
Scope: `apps/web`, `apps/mobile`, shared `packages/types`, and `services/fphgo` route/API support.  
Constraint: assessment only. No application code was changed.

## Executive Verdict

Mobile is not a thin shell anymore. It has real implementations for the social core: home activity feed, profiles, media posting, Chika, Buddy Finder, groups, events discovery/detail, messaging, notifications, and Explore browsing/submission.

But it is not 1:1 with web. The biggest gaps are not small polish issues:

1. Web has broad school/course/booking and school management surfaces; mobile has placeholders only.
2. Web has mature event organizer management: setup, participants, check-in, payments, join forms, program, awards, sponsors, competitions, passes. Mobile only supports attendee-facing discovery, join/leave/interest, event updates, and reactions.
3. Web profile has Badges, Passport, Journey, Dive Map, Dive Memories, saved hub, avatar/cover/media management, and full settings. Mobile profile has posts, derived dive-site highlights, diving presences/affinities, and basic display-name/bio editing.
4. Web Explore has map-centric browsing, site detail depth, edits, updates, reviews, presences, affinities, save/like, submissions, moderation, and admin review. Mobile has list/detail, create submission, like/save API hooks, and recent reports, but no map, edit proposal, update submission UI, my submissions UI, reviews/presence/affinity UI, or moderation.
5. Admin/moderation should remain web-only unless the product explicitly requires mobile operations. Do not waste mobile build time there.

The blunt version: mobile is viable for a social MVP, but not for full product parity. Phase 1 should deepen the existing mobile core instead of porting every web route.

## Method

Read:

- `.ai/README.md`
- `.ai/core/project-brief.md`
- `.ai/core/product-rules.md`
- `.ai/core/architecture-rules.md`
- `.ai/core/conventions.md`
- selected launch and feature docs under `docs/`
- web route files under `apps/web/src/app/**`
- web feature APIs under `apps/web/src/features/**`
- mobile Expo Router files under `apps/mobile/app/**`
- mobile feature screens/APIs under `apps/mobile/src/features/**`
- shared contracts under `packages/types/src/**`
- backend feature route modules under `services/fphgo/internal/features/**`

## Parity Matrix

| Feature Area | Web Route/Page | Web File(s) | Web Capability | Mobile Screen/Flow | Mobile File(s) | Parity Status | Gap Details | Priority | Recommended Action |
|---|---|---|---|---|---|---|---|---|---|
| Public SEO/content | `/about-us`, `/features`, `/features/*`, `/freediving`, `/freediving/[location]`, `/guides`, `/guides/[slug]` | `apps/web/src/app/(public)/**`, `apps/web/src/features/public-content/**` | SEO landing pages, location pages, guides, JSON-LD, ads, markdown-readable routes | `Learn` placeholder, `Founder’s Note` placeholder | `apps/mobile/app/(app)/(tabs)/(home)/learn.tsx`, `founders-note.tsx` | Placeholder | Mobile intentionally does not render web SEO content. It only tells users to use web. | P2 | Port only high-value guides as native reading cards if retention data says it matters. Do not chase SEO parity in mobile. |
| Auth | `/sign-in`, `/sign-up`, `/auth` | `apps/web/src/app/sign-in/**`, `sign-up/**`, `auth/page.tsx` | Clerk web sign-in/sign-up and redirect | `/sign-in`, `/sign-up` | `apps/mobile/app/sign-in.tsx`, `sign-up.tsx`, `src/features/auth/auth-screen.tsx` | Implemented | Platform-specific auth exists on both. | P0 | Keep aligned with Clerk token expectations. |
| Home feed | `/` | `apps/web/src/app/page.tsx`, `apps/web/src/features/home-feed/**` | Mixed activity feed, feed modes, nearby conditions, quick actions, impressions/actions | Home tab | `apps/mobile/app/(app)/(tabs)/(home)/index.tsx`, `src/features/home-feed/**` | Partial | Mobile uses `/v1/feed/activity` with item actions for Chika vote, media like, not-interested. Web also has `/v1/feed/home`, nearby conditions, mode tabs, and impression tracking. | P0 | Add mobile feed mode/conditions support only if backend contracts are stable; keep mobile list dense and native. |
| Profile redirect/current user | `/profile`, `/profile/settings`, `/profile/[username]` legacy | `apps/web/src/app/profile/**` | Current-user redirect to canonical username route and settings route | Profile tab and public profile route | `apps/mobile/app/(app)/(tabs)/profile/**`, `apps/mobile/app/(app)/(tabs)/(home)/profile/**` | Implemented | Mobile has direct current profile and public profile routes. | P0 | Keep canonical username route handling and avoid username guessing. |
| Public/member profile view | `/[username]` | `apps/web/src/app/[username]/page.tsx`, `apps/web/src/features/profile/pages/ProfilePage.tsx` | Profile header, tabs, badges, dive map, journey, passport, memories, media/posts | Public profile screen | `src/features/profiles/screens/public-profile-screen.tsx` | Partial | Mobile has header, counts, posts, derived dive-site highlights, and diving presences/affinities. Missing badges, passport, journey, map, memories, bucket list, richer privacy/visibility states. | P0 | Build mobile profile tabs for Badges, Passport/Journey preview, and saved/relationship actions in Phase 1. |
| Own profile editing/settings | `/[username]/settings`, `/profile/settings` | `apps/web/src/app/[username]/settings/page.tsx`, `src/features/profile/pages/ProfileSettingsPage.tsx` | Full profile settings and visibility-oriented profile management | Profile edit inline, settings route | `src/features/profiles/screens/profile-screen.tsx`, `src/features/auth/screens/settings-screen.tsx` | Partial | Mobile edits display name and bio with local draft/outbox. Missing username/location/cert/PB/visibility/avatar/cover management. | P0 | Add minimal settings parity: avatar/cover, location/cert level, visibility where backend already supports it. |
| Profile media post create | `/[username]/create`, bottom nav Post | `apps/web/src/app/[username]/create/page.tsx`, `src/features/profile/pages/CreateProfilePostPage.tsx`, `src/features/media/**` | Media upload, profile media composer, dive-site picker, moments/photos | Create tab | `apps/mobile/app/(app)/(tabs)/create/index.tsx`, `src/features/media/components/media-composer-sheet.tsx` | Partial | Mobile has photo/moment composer, upload, draft/outbox behavior. Need confirm parity for dive-site tagging, save/bookmark, viewer dialog, and multiple media details. | P0 | Tighten media composer parity and post-detail navigation before adding new surfaces. |
| Media post detail/social | `/[username]/posts/[postId]` | `apps/web/src/app/[username]/posts/[postId]/page.tsx`, `src/features/media/pages/MediaPostDetailPage.tsx` | Detail page, comments, likes, saves, viewer dialog | Feed/profile media cards and comments sheet | `src/features/media/components/media-post-comments-sheet.tsx`, `src/features/home-feed/**` | Partial | Mobile has comment/like APIs and sheets, but no route-equivalent detail page found. | P1 | Add native media detail route if shared links and notifications need deep linking. |
| Saved hub | `/saved` | `apps/web/src/app/saved/page.tsx`, `apps/web/src/features/profiles/api/profiles.ts` | Saved sites and saved users tabs | No screen found | No mobile screen found | Missing | Backend/shared web API exists (`SavedHubResponse`, save user, saved sites). Mobile has Explore save API hooks but no saved hub. | P1 | Add `Saved` to profile/settings or search tab after Phase 1 core profile/feed work. |
| Search | No direct web global search route found; profile API has user search | `apps/web/src/features/profiles/api/profiles.ts` | User search API present; no main web route found | Search tab | `apps/mobile/app/(app)/(tabs)/search/index.tsx` | Placeholder | Mobile has a bottom-nav search placeholder only. | P1 | Product decision: define search scope. Do not build vague global search. |
| Chika list/create/detail | `/chika`, `/chika/create`, `/chika/[slug]` | `apps/web/src/app/chika/**`, `apps/web/src/features/chika/**` | Categories, thread list/detail, create modal/page, markdown editor, comments, nested replies, up/down votes, pseudonymous category handling, realtime hooks | Chika tab, post, detail | `apps/mobile/app/(app)/(tabs)/chika/**`, `src/features/chika/**` | Partial | Mobile implements list/detail/create/comments/reactions and local drafts/outbox. Missing rich markdown editor, realtime behavior, moderator actions, and likely full category filtering UX. | P0 | Phase 1 should polish Chika create/detail and deep-link handling, not rebuild web markdown complexity. |
| Messaging | `/messages`, `/messages/[threadId]` | `apps/web/src/app/messages/**`, `apps/web/src/features/messages/**` | Thread list, categories, requests, direct thread creation, send, mark read, request accept/decline, realtime hook | Messages tab and thread | `apps/mobile/app/(app)/(tabs)/messages/**`, `src/features/messages/**` | Partial | Mobile has threads, categories, unread, send, mark read, accept/decline. No realtime hook found and thread creation is API-level, not obviously exposed outside Buddy Finder/profile flows. | P0 | Add explicit start-message entry from profile/buddy contexts if product allows. Add realtime later. |
| Notifications | `/notifications` | `apps/web/src/app/notifications/page.tsx`, `src/features/notifications/**` | Notification list, settings, stats/read/delete APIs | Notifications drawer/home route | `apps/mobile/app/(app)/(tabs)/(home)/notifications.tsx`, `src/features/notifications/**` | Partial | Mobile has list, preferences, push device registration, coarse-area alerts. Web has read/delete/stats APIs; mobile lacks obvious read/delete controls. | P1 | Add mark-read/delete only if notification volume warrants it. Mobile push setup is the more important mobile-specific piece. |
| Buddy Finder | `/buddies`, `/buddy/[intentId]` | `apps/web/src/app/buddies/**`, `apps/web/src/app/buddy/[intentId]/page.tsx`, `src/features/buddies/api/buddy-finder.ts` | Public preview, member intents, create/delete own intents, message entry, share preview, redacted public pages | Buddies drawer route | `apps/mobile/app/(app)/(tabs)/(home)/buddies.tsx`, `src/features/buddies/**` | Partial | Mobile implements intent listing, create/delete, draft/outbox, and message entry. No share-preview route or full web public landing behavior. | P1 | Keep mobile focused on member intent workflow. Add share/deep-link handling after messaging/profile deep links. |
| Buddy relationships | Profile actions and buddy APIs | `apps/web/src/features/buddies/api/buddies.ts`, profile surfaces | Incoming/outgoing requests, accept/decline/cancel, buddy list, remove, preview | No dedicated mobile relationship screen found | No mobile relationship API/screen beyond Buddy Finder | Missing | Backend/web hooks exist. Mobile Buddy Finder is not the same as bilateral buddy relationships. | P0 | Phase 1 should add profile action states and request inbox/outbox if buddies are core to mobile MVP. |
| Groups directory/detail | `/groups`, `/groups/[slug]` | `apps/web/src/app/groups/**`, `apps/web/src/features/groups/**` | Directory, create group, my groups, join/leave/invite, members, posts, create posts, visibility handling | Groups drawer route and detail | `apps/mobile/app/(app)/(tabs)/(home)/groups/**`, `src/features/groups/**` | Partial | Mobile has list/detail, join/leave/invite accept/reject, members, posts, create post with draft/outbox. Missing group creation, invitations, richer management/member role actions. | P1 | Add create group only after Phase 1 profile/feed/social basics are complete. |
| Group management | `/management/groups`, `/management/groups/[slug]/*` | `apps/web/src/app/management/groups/**`, `src/features/groups/components/group-management-page.tsx` | Owner/moderator workspace, members/posts/profile/settings sections | No management equivalent | No mobile screen found | Not Applicable | This is a workspace/admin-style flow. It is better web-first unless owners require field moderation on mobile. | Web-only | Keep web-only for now. |
| Events discovery/detail | `/events`, `/events/[slug]`, `/events/create` | `apps/web/src/app/events/**`, `src/features/events/**` | Event list/detail, create event, join/leave/interest, posts, participants, passes, competitions/prizes, payments, check-in CTAs | Events drawer route and detail | `apps/mobile/app/(app)/(tabs)/(home)/events*.tsx`, `src/features/events/**` | Partial | Mobile has list/detail, join/leave, interest, event posts, update create, fish reactions. Missing create event, pass/check-in, payment proof, participant form, competitions/prizes, detail management complexity. | P1 | Do not port organizer management first. Add event create only if mobile creators are a launch requirement. |
| Event management | `/management/events`, `/management/events/[slug]/*`, legacy `/events/[slug]/manage*` redirects | `apps/web/src/app/management/events/**`, `apps/web/src/app/events/[slug]/manage/**`, `src/features/events/components/event-management-shell.tsx` | Organizer workspace: setup, participants, check-in, payments, posts, program, settings, sponsors, awards, join form | No mobile equivalent | No mobile management screen found | Not Applicable | This is too complex for current mobile parity. Web is the right operational surface. | Web-only | Keep web-only. Consider a tiny organizer check-in scanner only if field operations demand it. |
| Event pass | `/events/[slug]/pass/[token]` | `apps/web/src/app/events/[slug]/pass/[token]/page.tsx` | Tokenized participant pass/check-in surface | No screen found | No mobile screen found | Missing | Backend/web support exists. Mobile may need it for attendees if passes are central. | P1 | Product decision: if passes are used at events, add mobile deep-link pass view. |
| Explore directory/map | `/explore` | `apps/web/src/app/explore/page.tsx`, `apps/web/src/features/explore/**`, `src/features/diveSpots/api/explore-v1.ts` | Map + synchronized results panel, filters, likes/saves, site cards | Explore drawer route | `apps/mobile/app/(app)/(tabs)/(home)/explore.tsx`, `src/features/explore/screens/explore-screen.tsx` | Partial | Mobile has list browsing and submission form. No map, no viewport clustering, no advanced filters, and save/like UI needs confirmation even though hooks exist. | P0 | Phase 1 should make Explore usable on mobile: search/filter, site detail, save/like, and no-map fallback. Native map can wait. |
| Explore site detail | `/explore/sites/[slug]` | `apps/web/src/app/explore/sites/[slug]/**`, server APIs in `explore-v1.server.ts` | SEO detail, buddy previews, related sites, community posts, presences, affinities, reviews, updates, delete for super admin | Explore site detail screen | `src/features/explore/screens/explore-site-detail-screen.tsx` | Partial | Mobile shows detail and recent reports. Missing buddy previews, community posts, related sites, reviews, presence/affinity actions, super-admin delete. | P0 | Add only user-facing actions first: save/like, buddy intents, updates/reports. Keep super-admin delete web-only. |
| Explore submit/edit/submissions/updates | `/explore/submit`, `/explore/sites/[slug]/suggest-edit`, `/explore/submissions`, `/explore/submissions/[id]`, `/explore/updates` | `apps/web/src/app/explore/**` | Submit new site, suggest edits, owner submission list/detail, latest updates page | Submit form embedded in Explore | `src/features/explore/screens/explore-screen.tsx`, mobile explore API | Partial | Mobile can submit new sites. Missing suggest-edit UI, my submissions/status UI, latest updates route, and update creation. | P1 | Add my submissions/status if submission workflow is promoted on mobile. |
| Explore moderation/admin | `/admin/moderation/explore-sites*`, `/admin/moderation/explore-site-edits*` | `apps/web/src/app/admin/moderation/**`, `src/features/diveSpots/api/explore-v1.ts` | Moderator review approve/reject/hide/flag/restore flows | No mobile equivalent | No mobile screen found | Not Applicable | Moderation is sensitive and better controlled on web. | Web-only | Keep web-only. |
| Schools public | `/schools`, `/schools/[slug]`, `/schools/[slug]/courses`, `/schools/[slug]/courses/[courseSlug]`, `/schools/[slug]/courses/[courseSlug]/book`, `/my/bookings` | `apps/web/src/app/schools/**`, `apps/web/src/app/my/bookings/page.tsx`, `src/features/schools/pages/PublicSchoolsPage.tsx` | School browsing, profile, courses, sessions, booking, payment/cancel booking, my bookings | Schools placeholder | `apps/mobile/app/(app)/(tabs)/(home)/schools.tsx` | Placeholder | Mobile explicitly says school listings are coming and to use web. Shared school DTOs and web API exist. | P1 | Product decision: if bookings are business-critical on mobile, this becomes Phase 2/3. Otherwise do not block MVP. |
| School management | `/management/schools`, `/management/schools/[slug]/*` | `apps/web/src/app/management/schools/**`, `src/features/schools/pages/ManageSchoolsPage.tsx`, `src/features/schools/api/schools.ts` | School owner/admin workspace: profile, courses, members, sessions, bookings, payments, settings | Manage Schools placeholder | `apps/mobile/app/(app)/(tabs)/(home)/manage-schools.tsx` | Placeholder | Mobile is intentionally placeholder. | Web-only | Keep web-first. Mobile management is expensive and not needed for consumer MVP. |
| Instructor application/profile | `/instructor/apply`, `/instructor/profile`, `/instructor/certifications`, `/management/instructor-profile` | `apps/web/src/app/instructor/**`, `apps/web/src/app/management/instructor-profile/page.tsx`, `src/features/instructors/**` | Instructor application, profile editing, certifications, proof upload, verification status, management edit mode | Instructor Application placeholder | `apps/mobile/app/(app)/(tabs)/(home)/instructor-application.tsx` | Placeholder | Mobile tells users to use web. Backend/shared contracts exist. | P1 | Do not port until schools/instructor acquisition needs mobile. |
| Public instructor profile | `/instructors/[username]` | `apps/web/src/app/instructors/[username]/page.tsx` | Public instructor profile with SEO metadata and structured data | No mobile equivalent found | No mobile screen found | Missing | Could be reached from schools later, but no school mobile implementation exists. | P2 | Defer behind schools mobile. |
| Admin overview | `/admin` | `apps/web/src/app/admin/page.tsx`, `apps/web/src/app/admin/_components/admin-page.tsx` | Super-admin dashboard requiring `super_admin` | No mobile equivalent | No mobile screen found | Not Applicable | Correctly web-only. | Web-only | Keep web-only. |
| Admin buddies/dive-sites/groups/instructors | `/admin/buddies`, `/admin/dive-sites`, `/admin/groups`, `/admin/instructors` | `apps/web/src/app/admin/**`, `src/features/admin/**`, `src/features/instructors/**` | Super-admin lists, group edit/archive, instructor verification state changes | No mobile equivalent | No mobile screen found | Not Applicable | Sensitive operations. Mobile implementation would increase risk without clear benefit. | Web-only | Keep web-only. |
| Reports/moderation | `/admin/moderation`, `/admin/moderation/reports*`, legacy `/moderation*` redirects | `apps/web/src/app/admin/moderation/**`, `apps/web/src/app/moderation/**`, `src/features/reports/**` | Report triage, status updates, moderation actions on users/Chika, role gated | No mobile equivalent | No mobile screen found | Not Applicable | Sensitive workflow. | Web-only | Keep web-only. |
| Badges management | `/management/badges` | `apps/web/src/app/management/badges/page.tsx`, `src/features/profile/pages/BadgeManagementPage.tsx`, `packages/types/src/api/badges.ts` | Manage personal badges/credentials with generic verification-ready contract | No mobile equivalent found | No mobile screen found | Missing | Backend/shared DTOs exist. Mobile public profile does not surface badges. | P0 | Add read-only badge showcase to mobile profile first. Badge management can remain web until later. |
| Dive Map/Journey/Passport/Memories | Profile tabs/components | `src/features/profile/components/ProfileDiveMap.tsx`, `ProfileJourney.tsx`, `ProfilePassport.tsx`, `ProfileDiveMemories.tsx`, API in `src/features/profiles/api/profiles.ts` | Rich profile-experience sections and write APIs for journey/memories/passport settings | Diving tab only | `src/features/profiles/components/profile-diving-section.tsx`, mobile profile activity query | Partial | Mobile has `/v1/profiles/{username}/diving` presences/affinities only. It does not use dive map/passport/journey/memories contracts. | P0 | Build a compact mobile Passport/Profile Experience read surface before write workflows. |
| Media library | `/media` | `apps/web/src/app/media/page.tsx`, `src/features/media/components/MediaList.tsx`, `MediaUploadPanel.tsx` | Authenticated media library and upload panel | Create/profile media flows | `src/features/media/**` | Partial | Mobile uploads and posts media but lacks a standalone media library. | P2 | Defer standalone library. Mobile users care about posting and profile display first. |
| Onboarding | `/onboarding` | `apps/web/src/app/onboarding/page.tsx` | Authenticated profile setup/update flow | No route found | No mobile route found | Missing | Mobile likely depends on profile existence but no onboarding screen was located. | P0 | Add minimal mobile onboarding if first-run users can reach a dead profile state. |
| Parked future modules | `/training-logs`, `/competitive-records`, `/safety`, `/awareness`, `/services`, `/marketplace`, `/collaboration`, `/coming-soon` | `apps/web/src/app/*/page.tsx`, placeholder feature APIs | Parked or coming-soon feature pages | Search/Learn placeholders only | Various placeholder/readiness files | Placeholder | These are not implemented product features on web either. | Web-only/P2 | Do not port until product scope changes. |

## Grouped Summaries

### Core User-Facing Features Already 1:1 Or Close

- Auth: both platforms have Clerk-backed sign-in/sign-up.
- Home activity feed: mobile has a real feed with item actions, though it lacks web feed modes/conditions.
- Chika: mobile has real list/detail/create/comment/reaction flows.
- Messaging: mobile has real thread list/detail/send/request handling, but lacks obvious realtime parity.
- Buddy Finder: mobile supports member intent workflow and message entry.
- Groups: mobile supports browsing, detail, joining/leaving, member list, posts, and creating group posts.
- Events: mobile supports attendee-facing browse/detail/join/leave/interest/posts/reactions.
- Notifications: mobile has notification list, preferences, push registration, and coarse-area alert settings.

### Web Features Missing From Mobile

- Buddy relationship request inbox/outbox/list/remove.
- Saved hub.
- Onboarding.
- Search implementation.
- Badges read surface and badge management.
- Dive Map, Journey, Passport, Dive Memories.
- Media post detail route/deep link.
- Event create and pass view.
- Schools, courses, booking, my bookings.
- Instructor application and public instructor profile.
- Admin/moderation surfaces, intentionally web-only unless product changes.

### Mobile-Only Features Not Present On Web

- Native push device registration and Expo push token management.
- Coarse foreground location helper for nearby dive alert settings.
- Local drafts/outbox panels across profile edit, Chika, Buddy Finder, group posts, and media composer.
- Native bottom-tab search route exists, but it is only a placeholder.

### Management/Admin Features That Should Probably Stay Web-Only

- `/admin/**`
- `/admin/moderation/**`
- `/management/schools/**`
- `/management/events/**` except possibly a future field check-in scanner
- `/management/groups/**`
- `/management/instructor-profile`

Reason: these are stateful operational workflows with higher authorization, audit, and data-integrity risk. Mobile adds cost and failure modes. Port only if there is a specific field-use case.

### Features Needing Product Decision Before Porting

- Whether mobile needs school booking in MVP or web handoff is acceptable.
- Whether event creation belongs on mobile, or web remains the organizer surface.
- Whether mobile search should be global, scoped by domain, or just a dive-site/member search.
- Whether Buddy relationships are core enough to prioritize ahead of schools/events.
- Whether profile Passport/Journey should be read-only first or support writes on mobile.
- Whether event passes/check-in are attendee-facing, organizer-facing, or both.

### API/Backend Support Already Available But Mobile UI Missing

- Badge contracts: `packages/types/src/api/badges.ts`; backend profile badge support under `services/fphgo/internal/features/profiles`.
- Profile experience contracts: `packages/types/src/api/dive-passport.ts`, `dive-journey.ts`, `dive-memories.ts`; backend features under `services/fphgo/internal/features/dive_*`.
- Saved hub and save user: `apps/web/src/features/profiles/api/profiles.ts`.
- Buddy relationships: `apps/web/src/features/buddies/api/buddies.ts`, backend `services/fphgo/internal/features/buddies`.
- Schools/courses/bookings/management: `apps/web/src/features/schools/api/schools.ts`, `packages/types/src/schools.ts`, backend `services/fphgo/internal/features/schools`.
- Instructor application/certifications: `apps/web/src/features/instructors/api/instructors.ts`, `packages/types/src/instructors.ts`, backend `services/fphgo/internal/features/instructors`.
- Explore edit proposals, submissions status, reviews, presence, affinities, moderation: `apps/web/src/features/diveSpots/api/explore-v1.ts`, backend `services/fphgo/internal/features/explore`.
- Event management, payments, passes, program, sponsors, competitions, participant roles/status: `apps/web/src/features/events/api/events.ts`, backend `services/fphgo/internal/features/events`.

### Shared Types/API Hooks Mobile Can Reuse Or Should Align With

- Mobile already imports many shared DTOs from `@freediving.ph/types`.
- Continue using `packages/types/src` as the cross-platform contract boundary.
- Do not create mobile-local API contract types for web/API DTOs.
- Prefer mirroring web API clients where the route contract is identical, but do not copy web UI structure blindly. Mobile should use native sheets, compact list rows, offline drafts, and deep links.

## Implementation Quality Assessment

### P0 Partial/Missing Mobile Features

| Feature | Backend Exists | Shared DTO Exists | Web Client/Hook Exists | Mobile UX Concern | Notes |
|---|---:|---:|---:|---|---|
| Profile badges | Yes | Yes | Yes | Read-only badge strip or tab first; management later | Do not build verification workflow on mobile yet. |
| Passport/Journey/Dive Map/Memories | Yes | Yes | Yes | Needs compact read surface; maps may be simplified before native map | Start with read-only Passport/profile-experience summary. |
| Buddy relationship requests | Yes | Likely in root `packages/types/src/index.ts` and web API usage | Yes | Needs profile action button states and request inbox/outbox | This is core social graph, not Buddy Finder. |
| Onboarding | Profile update backend exists | Profile DTOs exist | Web page exists | Mobile first-run flow must be short | Without this, new users can hit profile dead ends. |
| Explore mobile usability | Yes | Yes | Yes | Native list/filter first; map later | Add save/like/update/status actions before native map. |
| Media composer/detail | Yes | Yes | Yes | Use sheet/gallery/deep link, not web dialog | Mobile already has a good start; finish deep-link detail parity. |
| Chika polish | Yes | Yes | Yes | Native composer and draft flow are correct; avoid web markdown editor bloat | Add category filtering/deep links/realtime only as needed. |
| Messaging/profile entry | Yes | Yes | Yes | Profile and Buddy Finder should expose clear start-message actions | Be careful with anti-spam and buddy/block policy. |

### P1/P2 Missing Mobile Features

| Feature | Backend Exists | Shared DTO Exists | Web Client/Hook Exists | Mobile UX Concern | Notes |
|---|---:|---:|---:|---|---|
| Schools/courses/bookings | Yes | Yes | Yes | Booking UX must be native and payment-proof friendly | Business decision, not engineering guesswork. |
| Event create/pass | Yes | Yes | Yes | Create should be short; pass needs deep-link/token handling | Organizer workspace should stay web-only. |
| Saved hub | Yes | Yes | Yes | Could live under Profile or Search | Straightforward after core actions exist. |
| Search | Partial | Partial | Partial | Must define scope | Do not build a generic weak search. |
| Public learning/guides | Web content exists | No special need | Web content components exist | Native reading list optional | Not MVP-critical unless acquisition strategy needs it. |

## Missing Mobile Implementation Backlog

### P0

1. Mobile onboarding for first-run profile setup.
2. Profile parity: badges read surface, passport/profile-experience summary, avatar/cover/location/cert fields.
3. Buddy relationship actions: add/request/accept/decline/cancel/remove and request lists.
4. Explore usable mobile parity: search/filter, save/like visible UI, site updates/report hooks, my submissions status.
5. Media detail/deep-link route and comment/like/save parity.
6. Chika polish: category filtering, deep-link routing, and reply/vote failure handling verification.
7. Messaging entry points from profile and Buddy Finder where allowed.

### P1

1. Event create and attendee pass view if product requires mobile event participation beyond RSVP.
2. Saved hub.
3. Notification read/delete controls.
4. Group create and invite/member-role flows.
5. Schools browse/course detail/book if commercial strategy needs mobile conversion.
6. Instructor application if instructor acquisition needs mobile.

### P2

1. Native map for Explore.
2. Public guide/learn content.
3. Public instructor profile mobile route.
4. Standalone media library.
5. Parked future modules only when they stop being parked.

### Web-Only

1. Admin and moderation dashboards.
2. Full school management.
3. Full event organizer management.
4. Full group management workspace.
5. Instructor management/verification admin.

## Suggested Implementation Sequence

### Phase 1: Core Mobile Parity

- Add mobile onboarding for profile setup.
- Add profile parity: avatar/cover, location/cert fields, badge showcase, compact Passport/Profile Experience tab.
- Add Buddy relationship request/list/actions and profile action states.
- Finish media post detail/deep links and comment/like/save behavior.
- Improve Explore list/detail with visible save/like, filtering, site updates/report submission, and my submissions status.
- Polish Chika category/deep-link behavior.
- Add profile/Buddy Finder message entry points only where backend policy permits.

### Phase 2: Community Depth

- Group creation and richer group invite/member actions.
- Event create and event pass view if product confirms mobile need.
- Saved hub.
- Notifications read/delete controls.
- Explore related/buddy/community post sections.

### Phase 3: Commercial/Organization Surfaces

- Schools listing/course detail/booking.
- My bookings.
- Instructor application.
- Public instructor profile.

### Phase 4: Web-Only Or Admin Surfaces

- Keep admin/moderation on web.
- Keep full school/event/group management on web unless a field-specific workflow is justified.
- Consider only narrow mobile operations: event check-in scanner, booking proof upload, or emergency moderation queue, each with a separate product decision.

## Risks And Assumptions

- This assessment is code-wise only. No emulator, device, or runtime browser testing was performed.
- Route presence was not counted as implementation when the screen is a placeholder.
- Some web behavior is concentrated in very large client files, especially event detail/management. The matrix groups those capabilities by feature because line-by-line event subfeature parity would be noise.
- Mobile already has offline/draft behavior in several flows. Web does not need to match that; it is a mobile-specific advantage.
- Admin and management mobile parity would be high cost and high risk. Porting them without a field-use case is bad prioritization.
- Shared backend support does not mean mobile should copy web UX. For schools, events, Explore maps, and profile experience, mobile needs narrower flows.

## Verification Commands Run

- `find apps/web/src/app -type f \( -name 'page.tsx' -o -name 'layout.tsx' -o -name 'route.ts' \) | sort | wc -l`
  - Result: passed. Counted 146 web route/layout/route-handler files.
- `find apps/mobile/app apps/mobile/src/features -type f \( -name '*.tsx' -o -name '*.ts' \) | sort | wc -l`
  - Result: passed. Counted 141 mobile route/feature files.
- `rg -n "NavPlaceholderScreen|Search is coming soon|coming to mobile|Use the web app" apps/mobile/app apps/mobile/src/features`
  - Result: passed. Confirmed placeholder mobile routes for schools, manage schools, instructor application, learn, founder note, and search.
- `rg -n "(/v1/|routes\.v1|fphgoFetch|axiosInstance\.(get|post|put|patch|delete))" apps/web/src/features apps/mobile/src/features packages/types/src services/fphgo/internal/features | wc -l`
  - Result: passed. Found 711 API/contract/backend route references used for cross-checking.
- `pnpm --filter @freediving.ph/web type-check`
  - Result: passed.
- `pnpm --filter @freediving.ph/mobile type-check`
  - Result: blocked by local dependency state, not by this report. Failure excerpt: `Cannot find module '/Volumes/Files/softwareengineering/my-projects/freediving.ph/apps/mobile/node_modules/typescript/bin/tsc'`.
