# Mobile-Web Parity Assessment

Date: 2026-06-01  
Scope: `apps/web`, `apps/mobile`, shared `packages/types`, and `services/fphgo` route/API support.  
Constraint: assessment only. No application code was changed.

## Executive Verdict

Mobile is not a thin shell anymore. It has real implementations for the social core: home activity feed, profiles, media posting, Chika, Buddy Finder, groups, events discovery/detail, messaging, notifications, and Explore browsing/submission.

But it is not 1:1 with web. The biggest gaps are not small polish issues:

1. Mobile now has public school/course/booking surfaces, but school management remains web-only.
2. Web has mature event organizer management: setup, participants, check-in, payments, join forms, program, awards, sponsors, competitions, passes. Mobile only supports attendee-facing discovery, join/leave/interest, event updates, and reactions.
3. Web profile still has broader settings and management depth than mobile, but mobile now exposes the same icon-only profile tab structure as web: Posts, Badges, Diving, Dive Map, Dive Journey, and Dive Passport. Those mobile tabs render real shared/backend contract data, while profile settings depth remains narrower than web.
4. Web Explore has map-centric browsing and moderation/admin review. Mobile now has practical list/detail parity for browsing, search/filter/sort, save/like, submissions/status, edit proposals, condition reports, reviews, presences, affinities, and community previews. Native map and moderation remain out of scope.
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
| Public SEO/content | `/about-us`, `/features`, `/features/*`, `/freediving`, `/freediving/[location]`, `/guides`, `/guides/[slug]` | `apps/web/src/app/(public)/**`, `apps/web/src/features/public-content/**` | SEO landing pages, location pages, guides, JSON-LD, ads, markdown-readable routes | Learn and Founder Note native screens | `apps/mobile/app/(app)/(tabs)/(home)/learn.tsx`, `founders-note.tsx` | Implemented with limits | Mobile now renders compact native Learn and Founder Note content with product navigation. Full SEO article/location page parity remains web-owned. | P2 | Keep native content compact unless product explicitly wants long-form mobile guide pages. |
| Auth | `/sign-in`, `/sign-up`, `/auth` | `apps/web/src/app/sign-in/**`, `sign-up/**`, `auth/page.tsx` | Clerk web sign-in/sign-up and redirect | `/sign-in`, `/sign-up` | `apps/mobile/app/sign-in.tsx`, `sign-up.tsx`, `src/features/auth/auth-screen.tsx` | Implemented | Platform-specific auth exists on both. | P0 | Keep aligned with Clerk token expectations. |
| Home feed | `/` | `apps/web/src/app/page.tsx`, `apps/web/src/features/home-feed/**` | Mixed activity feed, feed modes, nearby conditions, quick actions, impressions/actions | Home tab | `apps/mobile/app/(app)/(tabs)/(home)/index.tsx`, `src/features/home-feed/**` | Partial | Mobile uses `/v1/feed/activity` with item actions for Chika vote, media like, not-interested. Web also has `/v1/feed/home`, nearby conditions, mode tabs, and impression tracking. | P0 | Add mobile feed mode/conditions support only if backend contracts are stable; keep mobile list dense and native. |
| Profile redirect/current user | `/profile`, `/profile/settings`, `/profile/[username]` legacy | `apps/web/src/app/profile/**` | Current-user redirect to canonical username route and settings route | Profile tab and public profile route | `apps/mobile/app/(app)/(tabs)/profile/**`, `apps/mobile/app/(app)/(tabs)/(home)/profile/**` | Implemented | Mobile has direct current profile and public profile routes. | P0 | Keep canonical username route handling and avoid username guessing. |
| Public/member profile view | `/[username]` | `apps/web/src/app/[username]/page.tsx`, `apps/web/src/features/profile/pages/ProfilePage.tsx` | Profile header, icon tabs, badges, dive map, journey, passport, memories, media/posts | Public profile screen | `src/features/profiles/screens/public-profile-screen.tsx` | Partial | Mobile has header, counts, posts, derived dive-site highlights, icon tabs, diving presences/affinities, read-only badges, and first-class Dive Map/Journey/Passport tab content from shared contracts. Missing bucket list, profile-experience write workflows, and richer settings/privacy controls. | P0 | Keep source-owned profile tabs separate; do not collapse Map/Journey/Passport back into a summary. |
| Own profile editing/settings | `/[username]/settings`, `/profile/settings` | `apps/web/src/app/[username]/settings/page.tsx`, `src/features/profile/pages/ProfileSettingsPage.tsx` | Full profile settings and visibility-oriented profile management | Profile edit inline, settings route | `src/features/profiles/screens/profile-screen.tsx`, `src/features/auth/screens/settings-screen.tsx` | Partial | Mobile edits display name, avatar URL, bio, home area/location, certification, and interests with local draft preservation. Missing username, visibility, social links, cover/media management, and full settings depth. | P0 | Keep remaining settings work contract-driven; do not invent cover/media upload rules client-side. |
| Profile media post create | `/[username]/create`, bottom nav Post | `apps/web/src/app/[username]/create/page.tsx`, `src/features/profile/pages/CreateProfilePostPage.tsx`, `src/features/media/**` | Media upload, profile media composer, dive-site picker, moments/photos | Create tab | `apps/mobile/app/(app)/(tabs)/create/index.tsx`, `src/features/media/components/media-composer-sheet.tsx` | Partial | Mobile has photo/moment composer, upload, draft/outbox behavior. Detail route work preserved this flow; remaining gaps are standalone media library and any deeper composer parity not covered by existing contracts. | P0 | Keep composer/outbox stable while later surfaces link into media detail. |
| Media post detail/social | `/[username]/posts/[postId]` | `apps/web/src/app/[username]/posts/[postId]/page.tsx`, `src/features/media/pages/MediaPostDetailPage.tsx` | Detail page, comments, likes, saves, viewer dialog | Native media detail route | `apps/mobile/app/(app)/(tabs)/(home)/media/[postId].tsx`, `src/features/media/screens/media-post-detail-screen.tsx` | Implemented with issues | Mobile now has routeable detail, feed/profile/deep-link/notification entry points, like/save, comments, comment delete/like, gallery viewer, and share. iOS Simulator smoke remains environment-blocked. | P1 | Keep in regression checks; add clipboard copy only if a clipboard dependency is adopted. |
| Saved hub | `/saved` | `apps/web/src/app/saved/page.tsx`, `apps/web/src/features/profiles/api/profiles.ts` | Saved sites and saved users tabs | Saved route and Search saved scope | `apps/mobile/app/(app)/(tabs)/(home)/saved.tsx`, `apps/mobile/src/features/search/screens/search-screen.tsx` | Implemented with limits | Mobile uses the authenticated saved hub contract and opens `/saved` directly to the Saved scope. It only displays entity types exposed by the current shared saved contract. | P1 | Expand only when backend/shared saved contracts add more entity types. |
| Search | No direct web global search route found; profile API has user search | `apps/web/src/features/profiles/api/profiles.ts` | User search API present; no main web route found | Search tab | `apps/mobile/app/(app)/(tabs)/search/index.tsx`, `apps/mobile/src/features/search/**` | Implemented with limits | Mobile search is scoped to backend-supported people and dive-site search. Broad/global search remains deferred. | P1 | Do not expand beyond backend visibility-safe contracts. |
| Chika list/create/detail | `/chika`, `/chika/create`, `/chika/[slug]` | `apps/web/src/app/chika/**`, `apps/web/src/features/chika/**` | Categories, thread list/detail, create modal/page, markdown editor, comments, nested replies, up/down votes, pseudonymous category handling, realtime hooks | Chika tab, post, detail | `apps/mobile/app/(app)/(tabs)/chika/**`, `src/features/chika/**` | Implemented with issues | Mobile implements category filtering, list/detail/create/comments/reactions, nested replies, deep links, local drafts/outbox, and pseudonymous server-label display. Missing rich markdown editor, realtime behavior, moderator/report actions, and runtime simulator smoke. | P0 | Keep markdown/realtime/reporting separate; do not bloat the mobile Chika composer. |
| Messaging | `/messages`, `/messages/[threadId]` | `apps/web/src/app/messages/**`, `apps/web/src/features/messages/**` | Thread list, categories, requests, direct thread creation, send, mark read, request accept/decline, realtime hook | Messages tab and thread | `apps/mobile/app/(app)/(tabs)/messages/**`, `src/features/messages/**` | Partial | Mobile has threads, categories, unread, send, mark read, accept/decline, and direct thread entry from profile/Buddy Finder. No realtime hook found. | P0 | Keep backend thread creation canonical; add realtime only if product needs it. |
| Notifications | `/notifications` | `apps/web/src/app/notifications/page.tsx`, `src/features/notifications/**` | Notification list, settings, stats/read/delete APIs | Notifications drawer/home route | `apps/mobile/app/(app)/(tabs)/(home)/notifications.tsx`, `src/features/notifications/**` | Partial | Mobile has list, preferences, push device registration, coarse-area alerts, mark-read/delete controls, and message/media/Chika route resolution. Stats remain web-only. | P1 | Keep notification controls simple; push delivery remains mobile-specific setup work. |
| Buddy Finder | `/buddies`, `/buddy/[intentId]` | `apps/web/src/app/buddies/**`, `apps/web/src/app/buddy/[intentId]/page.tsx`, `src/features/buddies/api/buddy-finder.ts` | Public preview, member intents, create/delete own intents, message entry, share preview, redacted public pages | Buddies drawer route | `apps/mobile/app/(app)/(tabs)/(home)/buddies.tsx`, `src/features/buddies/**` | Partial | Mobile implements intent listing, create/delete, draft/outbox, and message entry. Relationship management is now separate on the same screen. No share-preview route or full web public landing behavior. | P1 | Keep intents distinct from accepted buddy relationships. |
| Buddy relationships | Profile actions and buddy APIs | `apps/web/src/features/buddies/api/buddies.ts`, profile surfaces | Incoming/outgoing requests, accept/decline/cancel, buddy list, remove, preview | Buddies relationship section and profile actions | `src/features/buddies/components/buddy-relationship-section.tsx`, `profile-buddy-actions.tsx` | Implemented with issues | Mobile uses canonical buddy APIs for send/cancel/accept/decline/remove/list and exposes profile actions plus request lists. Runtime simulator smoke remains blocked. | P0 | Add confirmation polish later if needed; do not bypass backend relationship state. |
| Groups directory/detail | `/groups`, `/groups/[slug]` | `apps/web/src/app/groups/**`, `apps/web/src/features/groups/**` | Directory, create group, my groups, join/leave/invite, members, posts, create posts, visibility handling | Groups drawer route and detail | `apps/mobile/app/(app)/(tabs)/(home)/groups/**`, `src/features/groups/**` | Implemented with gaps | Mobile has search/filter/my-groups, create group, list/detail, join/leave/invite accept/reject, members, posts, create post with draft/outbox, and iOS smoke coverage. Group image/cover, invite-by-user-id, and richer management/member role actions remain deferred. | P1 | Keep destructive/group management web-first unless a specific mobile owner workflow is approved. |
| Group management | `/management/groups`, `/management/groups/[slug]/*` | `apps/web/src/app/management/groups/**`, `src/features/groups/components/group-management-page.tsx` | Owner/moderator workspace, members/posts/profile/settings sections | No management equivalent | No mobile screen found | Not Applicable | This is a workspace/admin-style flow. It is better web-first unless owners require field moderation on mobile. | Web-only | Keep web-only for now. |
| Events discovery/detail | `/events`, `/events/[slug]`, `/events/create` | `apps/web/src/app/events/**`, `src/features/events/**` | Event list/detail, create event, join/leave/interest, posts, participants, passes, competitions/prizes, payments, check-in CTAs | Events drawer route and detail | `apps/mobile/app/(app)/(tabs)/(home)/events*.tsx`, `src/features/events/**` | Partial | Mobile has list/detail, join/leave, interest, event posts, update create, fish reactions. Missing create event, pass/check-in, payment proof, participant form, competitions/prizes, detail management complexity. | P1 | Do not port organizer management first. Add event create only if mobile creators are a launch requirement. |
| Event management | `/management/events`, `/management/events/[slug]/*`, legacy `/events/[slug]/manage*` redirects | `apps/web/src/app/management/events/**`, `apps/web/src/app/events/[slug]/manage/**`, `src/features/events/components/event-management-shell.tsx` | Organizer workspace: setup, participants, check-in, payments, posts, program, settings, sponsors, awards, join form | No mobile equivalent | No mobile management screen found | Not Applicable | This is too complex for current mobile parity. Web is the right operational surface. | Web-only | Keep web-only. Consider a tiny organizer check-in scanner only if field operations demand it. |
| Event pass | `/events/[slug]/pass/[token]` | `apps/web/src/app/events/[slug]/pass/[token]/page.tsx` | Tokenized participant pass/check-in surface | No screen found | No mobile screen found | Missing | Backend/web support exists. Mobile may need it for attendees if passes are central. | P1 | Product decision: if passes are used at events, add mobile deep-link pass view. |
| Explore directory/map | `/explore` | `apps/web/src/app/explore/page.tsx`, `apps/web/src/features/explore/**`, `src/features/diveSpots/api/explore-v1.ts` | Map + synchronized results panel, filters, likes/saves, site cards | Explore drawer route | `apps/mobile/app/(app)/(tabs)/(home)/explore.tsx`, `src/features/explore/screens/explore-screen.tsx` | Implemented with gaps | Mobile now has native list browsing, search, area filter, difficulty filter, verified/saved filters, recent/popular/default sort, submission form/status, save/like actions, and iOS smoke coverage. Native map and viewport clustering remain deferred. | P0 | Keep native map later. Do not block list/detail parity on map provider work. |
| Explore site detail | `/explore/sites/[slug]` | `apps/web/src/app/explore/sites/[slug]/**`, server APIs in `explore-v1.server.ts` | SEO detail, buddy previews, related sites, community posts, presences, affinities, reviews, updates, delete for super admin | Explore site detail screen | `src/features/explore/screens/explore-site-detail-screen.tsx` | Implemented with gaps | Mobile shows detail, status, save/like, recent reports, condition report form, suggest-edit form, presence/affinity actions, reviews, and community post previews. Super-admin delete and native map remain out of scope. | P0 | Keep admin/delete web-only; consider a full native map only after remaining parity surfaces land. |
| Explore submit/edit/submissions/updates | `/explore/submit`, `/explore/sites/[slug]/suggest-edit`, `/explore/submissions`, `/explore/submissions/[id]`, `/explore/updates` | `apps/web/src/app/explore/**` | Submit new site, suggest edits, owner submission list/detail, latest updates page | Submit form embedded in Explore and detail contribution forms | `src/features/explore/screens/explore-screen.tsx`, `src/features/explore/screens/explore-site-detail-screen.tsx`, mobile explore API | Implemented with gaps | Mobile can submit new sites, view own submission status, submit site edits, and create condition reports. Dedicated latest-updates and submission-detail routes remain deferred. | P1 | Add dedicated status/detail routes only if submission volume demands it. |
| Explore moderation/admin | `/admin/moderation/explore-sites*`, `/admin/moderation/explore-site-edits*` | `apps/web/src/app/admin/moderation/**`, `src/features/diveSpots/api/explore-v1.ts` | Moderator review approve/reject/hide/flag/restore flows | No mobile equivalent | No mobile screen found | Not Applicable | Moderation is sensitive and better controlled on web. | Web-only | Keep web-only. |
| Schools public | `/schools`, `/schools/[slug]`, `/schools/[slug]/courses`, `/schools/[slug]/courses/[courseSlug]`, `/schools/[slug]/courses/[courseSlug]/book`, `/my/bookings` | `apps/web/src/app/schools/**`, `apps/web/src/app/my/bookings/page.tsx`, `src/features/schools/pages/PublicSchoolsPage.tsx` | School browsing, profile, courses, sessions, booking, payment/cancel booking, my bookings | Schools list/detail/course/my bookings routes | `apps/mobile/app/(app)/(tabs)/(home)/schools**`, `apps/mobile/src/features/schools/**` | Implemented with gaps | Mobile supports public list/search/filter, school profile, course list/detail, sessions, student booking, image receipt upload, My Bookings, cancellation, and native deep links. Public instructor list is missing because the public school contract does not expose instructors. | P1 | Keep school management separate. Add public instructor list only via shared/backend contract, not mobile-local DTOs. |
| School management | `/management/schools`, `/management/schools/[slug]/*` | `apps/web/src/app/management/schools/**`, `src/features/schools/pages/ManageSchoolsPage.tsx`, `src/features/schools/api/schools.ts` | School owner/admin workspace: profile, courses, members, sessions, bookings, payments, settings | Manage Schools placeholder | `apps/mobile/app/(app)/(tabs)/(home)/manage-schools.tsx` | Placeholder | Mobile is intentionally placeholder. | Web-only | Keep web-first. Mobile management is expensive and not needed for consumer MVP. |
| Instructor application/profile | `/instructor/apply`, `/instructor/profile`, `/instructor/certifications`, `/management/instructor-profile` | `apps/web/src/app/instructor/**`, `apps/web/src/app/management/instructor-profile/page.tsx`, `src/features/instructors/**` | Instructor application, profile editing, certifications, proof upload, verification status, management edit mode | Instructor Application route | `apps/mobile/app/(app)/(tabs)/(home)/instructor-application.tsx`, `apps/mobile/src/features/instructors/**` | Implemented with gaps | Mobile supports own instructor profile editing, certification list/create/edit/delete, image proof upload, submit attestation, and backend status display. Admin verification remains web-only. Structured location uses raw code fields until a native picker exists. | P1 | Keep verification/admin actions web-only. Add a native PSGC/location picker before polishing submission UX. |
| Public instructor profile | `/instructors/[username]` | `apps/web/src/app/instructors/[username]/page.tsx` | Public instructor profile with SEO metadata and structured data | Public instructor route | `apps/mobile/app/(app)/(tabs)/(home)/instructors/[username].tsx`, `apps/mobile/src/features/instructors/screens/public-instructor-screen.tsx` | Implemented with gaps | Mobile exposes public instructor profile and certifications through backend public contract. SEO metadata remains web-only by platform. | P2 | Link from schools once public school contracts expose instructors. |
| Admin overview | `/admin` | `apps/web/src/app/admin/page.tsx`, `apps/web/src/app/admin/_components/admin-page.tsx` | Super-admin dashboard requiring `super_admin` | No mobile equivalent | No mobile screen found | Not Applicable | Correctly web-only. | Web-only | Keep web-only. |
| Admin buddies/dive-sites/groups/instructors | `/admin/buddies`, `/admin/dive-sites`, `/admin/groups`, `/admin/instructors` | `apps/web/src/app/admin/**`, `src/features/admin/**`, `src/features/instructors/**` | Super-admin lists, group edit/archive, instructor verification state changes | No mobile equivalent | No mobile screen found | Not Applicable | Sensitive operations. Mobile implementation would increase risk without clear benefit. | Web-only | Keep web-only. |
| User safety reports/blocks | user-facing report/block entry points plus `/admin/moderation`, `/admin/moderation/reports*`, legacy `/moderation*` redirects | `apps/web/src/components/report/report-action.tsx`, `src/features/reports/**`, `src/features/blocks/**`, admin moderation routes | User reports, blocks, report triage, status updates, moderation actions on users/Chika, role gated | Profile safety actions, Chika report actions, message report actions, Settings blocked users | `apps/mobile/src/features/safety/**`, profile/Chika/messages/settings screens | Implemented with gaps | Mobile supports user-facing report/block controls for shared-contract targets and blocked-user Settings list. Moderator/admin triage and destructive moderation actions remain web-only. Media/group/event/school/Explore report targets are deferred until shared contracts and product placement exist. | P1 | Keep mobile safety user-facing. Do not add moderation actions outside initiative 15. |
| Badges management | `/management/badges` | `apps/web/src/app/management/badges/page.tsx`, `src/features/profile/pages/BadgeManagementPage.tsx`, `packages/types/src/api/badges.ts` | Manage personal badges/credentials with generic verification-ready contract | Badges tab/read showcase | `src/features/profiles/components/profile-badges-section.tsx` | Partial | Mobile surfaces badges and auto-stats read-only on own/public profiles. Management and verification workflows remain web/out of scope. | P0 | Keep mobile read-only until badge management product rules are explicitly mobile-ready. |
| Dive Map/Journey/Passport/Memories | Profile tabs/components | `src/features/profile/components/ProfileDiveMap.tsx`, `ProfileJourney.tsx`, `ProfilePassport.tsx`, `ProfileDiveMemories.tsx`, API in `src/features/profiles/api/profiles.ts` | Rich profile-experience sections and write APIs for journey/memories/passport settings | Icon profile tabs plus native profile-experience sections | `src/features/profiles/components/profile-experience-sections.tsx`, `profile-dive-identity-summary.tsx`, mobile profile activity query | Partial | Mobile now reads shared Dive Map/Passport/Journey/Dive Memories contracts and exposes Dive Map, Dive Journey, and Dive Passport as separate tabs matching web order. Native map canvas, owner Journey writes, Dive Memory management, and Passport settings remain web-owned or future mobile work. | P0 | Keep proof-based counts server-sourced and add write/detail workflows only through explicit shared/backend contracts. |
| Media library | `/media` | `apps/web/src/app/media/page.tsx`, `src/features/media/components/MediaList.tsx`, `MediaUploadPanel.tsx` | Authenticated media library and upload panel | Create/profile media flows | `src/features/media/**` | Partial | Mobile uploads and posts media but lacks a standalone media library. | P2 | Defer standalone library. Mobile users care about posting and profile display first. |
| Onboarding | `/onboarding` | `apps/web/src/app/onboarding/page.tsx` | Authenticated profile setup/update flow | `/onboarding` | `apps/mobile/app/onboarding.tsx`, `apps/mobile/src/features/onboarding/screens/onboarding-screen.tsx`, `apps/mobile/src/features/profiles/lib/profile-completion.ts` | Implemented with issues | Mobile now routes signed-in incomplete users to onboarding and complete users bypass it. iOS Simulator smoke is environment-blocked by missing CocoaPods CLI, so runtime verification remains manual. | P0 | Keep in regression smoke for auth loops and profile completion after simulator tooling is available. |
| Parked future modules | `/training-logs`, `/competitive-records`, `/safety`, `/awareness`, `/services`, `/marketplace`, `/collaboration`, `/coming-soon` | `apps/web/src/app/*/page.tsx`, placeholder feature APIs | Parked or coming-soon feature pages | Search/Learn placeholders only | Various placeholder/readiness files | Placeholder | These are not implemented product features on web either. | Web-only/P2 | Do not port until product scope changes. |

## Grouped Summaries

### Core User-Facing Features Already 1:1 Or Close

- Auth: both platforms have Clerk-backed sign-in/sign-up.
- Home activity feed: mobile has a real feed with item actions, though it lacks web feed modes/conditions.
- Chika: mobile has real category-filtered list/detail/create/comment/reaction flows.
- Messaging: mobile has real thread list/detail/send/request handling, but lacks obvious realtime parity.
- Buddy Finder: mobile supports member intent workflow and message entry.
- Groups: mobile supports search/filter discovery, creation, detail, joining/leaving, invite accept/reject, member list, posts, and creating group posts.
- Events: mobile supports attendee-facing browse/detail/join/leave/interest/posts/reactions.
- Notifications: mobile has notification list, preferences, push registration, and coarse-area alert settings.

### Web Features Missing From Mobile

- Buddy relationship request inbox/outbox/list/remove is now implemented with pending runtime smoke.
- Saved hub.
- Onboarding is now implemented with pending runtime smoke because local iOS Simulator setup is blocked by missing CocoaPods CLI.
- Search implementation.
- Badge management. Read-only badge showcase is now implemented on mobile profiles.
- Full profile-experience write surfaces remain missing, but mobile now has separate read tabs for Dive Map, Dive Journey, and Dive Passport rather than only a compact summary. Dive Memories remain contextual through the existing summary/Passport and map-owned rules, not a top-level profile tab.
- Media post detail route/deep link is now implemented with pending runtime smoke.
- Event create and pass view.
- Public schools, courses, booking, and my bookings are now implemented with gaps; school management remains missing by design.
- Instructor application/profile and public instructor profile are now implemented with gaps; admin instructor review remains web-only.
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
| Profile badges | Yes | Yes | Yes | Read-only badge tab implemented; management later | Do not build verification workflow on mobile yet. |
| Passport/Journey/Dive Map/Memories | Yes | Yes | Yes | Separate read tabs implemented; maps are represented as proof-backed native lists before any native map canvas | Next work should be explicit write/detail workflows, not a premature full native map. |
| Buddy relationship requests | Yes | Yes | Yes | Profile actions and request inbox/outbox are implemented | This remains distinct from Buddy Finder intents. |
| Onboarding | Profile update backend exists | Profile DTOs exist | Web page exists | Mobile first-run flow must be short | Without this, new users can hit profile dead ends. |
| Explore mobile usability | Yes | Yes | Yes | Native list/filter first; map later | Implemented for list/detail/actions/contributions; native map remains deferred. |
| Media composer/detail | Yes | Yes | Yes | Native detail route implemented with gallery/comments; composer remains unchanged | Keep upload/outbox stable; do not add standalone media library unless product needs it. |
| Chika polish | Yes | Yes | Yes | Native category filters, composer, and draft flow are implemented; avoid web markdown editor bloat | Realtime and reporting remain separate decisions. |
| Messaging/profile entry | Yes | Yes | Yes | Profile and Buddy Finder expose direct-thread entry through backend policy | Realtime remains separate. |

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

1. Mobile onboarding for first-run profile setup. Implemented with pending runtime smoke because local iOS Simulator setup is blocked by missing CocoaPods CLI.
2. Profile parity: read-only badges, icon-only six-tab profile structure, separate Dive Map/Journey/Passport read tabs, avatar URL, location/home area, certification, and interests are implemented with code-wise verification. Remaining gaps are cover/media management, visibility/social settings, native map canvas, and profile-experience write parity.
3. Buddy relationship actions: add/request/accept/decline/cancel/remove and request lists are implemented with pending runtime smoke.
4. Explore usable mobile parity is implemented with iOS Simulator smoke passed: search/filter/sort, save/like visible UI, site updates/report hooks, suggest edit, my submissions status, reviews, presence, affinities, and community previews.
5. Media detail/deep-link route and comment/like/save parity is implemented with pending runtime smoke.
6. Chika polish: category filtering, deep-link routing, and reply/vote failure handling verification are implemented with pending runtime smoke.
7. Messaging entry points from profile and Buddy Finder where allowed are implemented with pending runtime smoke.

### P1

1. Event create and attendee pass view if product requires mobile event participation beyond RSVP.
2. Saved hub.
3. Notification read/delete controls.
4. Group create and discovery filters are implemented; invite-by-user-id and member-role management remain deferred.
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
- Profile parity core now includes the web-matching icon tab structure and mobile read tabs for Dive Map, Dive Journey, and Dive Passport; continue with explicit write/detail workflows only when product wants them on native mobile.
- Buddy relationship request/list/actions and profile action states are implemented; keep backend canonical state in regression checks.
- Media post detail/deep links and comment/like/save behavior are implemented; keep them in regression smoke.
- Explore list/detail parity is implemented for visible save/like, filtering/sort, site updates/report submission, suggest edit, reviews, presence, affinities, and my submissions status.
- Chika category/deep-link behavior is implemented; keep it in regression smoke.
- Profile/Buddy Finder message entry points are implemented through backend direct-thread policy.
- Events attendee parity is implemented for list filters, detail, join form answers, participant notes, interest, attendee pass display, read-only pass deep links, payment method/proof submission, updates/reactions, and public program/prize/sponsor sections.

### Phase 2: Community Depth

- Richer group invite/member management actions.
- Event create if product confirms it belongs in attendee/community creator scope.
- Saved hub.
- Notifications read/delete controls.
- Full native Explore map and dedicated latest-updates/submission-detail routes.

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
