# User Profile Experience

Status: curated canon from current repo inspection plus recent implementation handovers / mobile-prep truth

Primary sources:

- current repo inspection of `apps/web`, shared contracts, and profile route tests
- recent profile-experience rollout summaries covering badges, Dive Memories, Journey, Passport, and visited-site ownership boundaries

Related canon:

- `project-canon/product/overview.md`
- `project-canon/product/workflows.md`
- `project-canon/domain/entities.md`
- `project-canon/domain/business-rules.md`
- `project-canon/domain/permissions.md`

This document is the canonical source of truth for the FPH user profile experience and for future equivalent implementation work in `apps/mobile`.

It supersedes coarse profile-experience descriptions elsewhere in canon when this document is more specific.

## Purpose

The User Profile is the public/member-facing diver identity surface for `freediving.ph`.

It is not just a feed. It combines:

- raw user content
- achievements and credentials
- diving presence and site affinity
- location-tied dive memories
- chronological journey milestones
- curated passport-style showcase

The current web implementation is the product reference. Mobile must preserve source-of-truth boundaries while adapting layout and interactions to native/mobile UX.

## Current Profile Tabs

The current profile tab set is:

1. `Posts`
2. `Badges`
3. `Diving`
4. `Dive Memories`
5. `Dive Journey`
6. `Dive Passport`

### Posts

Purpose:

- raw media/content stream
- user posts, photos, videos, and short-form content
- the primary profile media surface

Rules:

- do not remove the `Posts` tab
- do not replace `Posts` with `Dive Memories`
- posts can contain location-tagged media
- location-tagged media may qualify visited-site truth only through backend-owned rules
- `Posts` remain the general content stream and are not the same surface as `Dive Memories`

Mobile guidance:

- use existing mobile feed/profile media grid conventions
- keep `Posts` visually distinct from `Dive Memories`
- do not overload `Posts` with map, passport, or journey responsibilities

### Badges

Purpose:

- achievements
- credentials and certifications
- personal bests
- field experience
- community roles
- auto stats

Rules:

- badges are their own source module
- badge categories can have parent/category identity logos
- badge earned date matters because it can feed downstream Journey chronology
- badges may appear as generated Journey milestones
- badges may appear as curated highlights in Passport
- badges must not create Dive Memories or visited-site truth
- Passport must not award or verify badges
- Journey must not award badges

Mobile guidance:

- show badges by category
- support compact badge identity/logo previews
- preserve category semantics
- keep edit/management actions owner/admin-scoped according to existing web and API behavior

### Diving

Purpose:

- diving overview and profile presence
- diving identity, preferences, and dive-site affinity/presence where supported

Current meaning:

- the current web tab includes Dive Presence and Dive Sites
- it is not the same as `Dive Memories`
- it is not the same as `Dive Journey`
- it is not the same as `Dive Passport`

Rules:

- `Diving` is an overview surface
- it must not silently become the source of truth for visited locations unless backend/API ownership changes explicitly
- it must not create Journey or Passport data by itself

Mobile guidance:

- treat `Diving` as profile overview/presence
- keep it lightweight and readable
- do not confuse it with location-memory features

### Dive Memories

Purpose:

- location-scoped social memory surface
- visited dive locations and the memories tied to them

Current evolution:

- this feature evolved from the older Dive Map direction
- the current top-level profile tab label is `Dive Memories`
- visited-site ownership still comes from the backend Dive Map/read-model family, not from social memory content

Core data model:

- the visited-site source of truth is `user_dive_sites`
- `user_dive_sites` is derived from qualifying user-owned `media_posts` tagged to `dive_site_id`
- Dive Memories are contextual/social memories tied to a dive site
- Dive Memories are not proof and do not create visited-site truth

Important route:

- web page route: `/dive-memories/[entrySlug]/[username]`
- this page uses a dedicated slug-based DTO/query
- it must not resolve the page by fetching the entire location list client-side
- it must not load all profile memories and filter client-side

Current direction for the location page:

- user-facing UI should avoid heavy `proof` wording
- do not show a separate `Proof` tab
- the content split should be `Media` and `Posts`
- `Media` should show location-tagged profile posts/media and supported Dive Memory media
- `Posts` should show Dive Memory posts tied to the selected dive location
- creation should happen through a dedicated site-locked create page, not an inline generic profile form
- owner create flow must be site-locked and must not expose raw dive-site UUID input

Rules:

- Dive Memories must not unlock dive sites
- Dive Memories must not create location markers
- Dive Memories must not inflate visited-site counts
- tagged/shared memories must not unlock locations for tagged users
- shared/tagged memories may appear only when visibility and tag-acceptance rules allow it
- a memory may appear inside a user location page only when visibility rules allow it
- do not make Dive Memories a top-level replacement for `Posts`
- do not treat Dive Memory uploads as qualifying proof posts

Mobile guidance:

- make the feature media-first
- the location page should feel like a social memory page, not a backend diagnostics page
- use a compact location header with back button, site name, area, and small pills/counts only when needed
- avoid large stat cards
- avoid developer-facing copy such as `proof-backed`
- `Media` should use a masonry or grid presentation similar to profile posts
- tapping media should open a viewer, dialog, or sheet
- `Posts` should show memory posts
- owner sees clear create/share controls
- visitor does not see owner create controls

### Dive Journey

Purpose:

- soft social/storytelling timeline
- diving progression, stories, and generated milestones

Can include:

- manual user-created Journey notes
- generated media/location activity
- visited-site milestones
- Dive Memory milestones
- badge additions
- personal bests
- certifications
- future course/event milestones

Must not:

- unlock Dive Memories locations
- increase visited-site counts
- award badges
- verify credentials
- mutate `Posts`
- mutate `Badges`
- mutate `Dive Memories`
- mutate `Dive Passport`
- become a source-of-truth module

Current direction:

- Journey is more than a free-text list
- it can contain manual and generated entries
- manual notes are editable by the owner
- generated entries are source-derived and read-only
- generated entries must not become freely editable independent truth
- if a generated entry date is wrong, fix the source data instead

UI direction:

- keep the timeline structure
- use compact rows instead of heavy cards
- use icon, color, and type as primary signal
- avoid noisy internal labels
- add/edit note flows should live in dialog or sheet style surfaces
- owner can add, edit, and delete manual notes
- visitor cannot see owner controls

Mobile guidance:

- use compact timeline rows
- avoid large cards
- keep chronological grouping
- make manual vs generated entries visually clear
- use bottom sheet or dialog for add/edit note
- avoid exposing internal enum names or source-boundary labels

### Dive Passport

Purpose:

- public diver showcase and snapshot
- curated aggregate presentation of the diver identity, highlights, footprint, and story

It should be:

- read-only aggregate presentation
- compact
- curated
- public-facing
- identity-driven
- high-signal

It must not be:

- a duplicated dashboard
- a second `Badges` page
- a second `Journey` page
- a second `Dive Memories` page
- a second location map truth surface
- a certification authority
- a source-of-truth module
- a mutation surface for child modules

Current source behavior:

- Passport consumes compact previews from child modules
- section visibility settings shape the aggregate output
- settings include `showMap`, `showBadges`, `showJourney`, and `showMemories`
- hidden sections return hidden/settings-hidden states where supported
- hidden preview payloads should not leak through the public aggregate response
- `featuredBadgeIds` controls badge curation
- badge fallback ranking is preferred over blind first-N slicing

Current UI direction:

- hero
- highlights
- dive footprint
- story preview
- owner-only `Customize Passport` dialog or sheet
- no inline settings block on the main page
- avoid dashboard-style equal cards

Rules:

- Passport must not unlock sites
- Passport must not create markers
- Passport must not inflate visited counts
- Passport must not award badges
- Passport must not verify credentials
- Passport must not mutate Journey
- Passport must not mutate Badges
- Passport must not mutate Dive Memories
- Passport must not mutate Posts
- Passport must only consume compact previews
- full child data belongs to child APIs

Owner vs visitor:

- visitor sees curated public showcase only
- visitor does not see hidden sections
- visitor does not see private Journey or Memory content
- visitor does not see customize controls
- owner sees the same showcase plus `Customize Passport`
- owner settings remain secondary rather than taking over the main view

Mobile guidance:

- do not turn Passport into a wall of boxes
- use a compact hero
- use lightweight sections
- prefer pills, rows, and dividers over repeated large cards
- keep Customize Passport in a mobile-friendly sheet or dialog
- keep the surface public-facing and clean

## Cross-Feature Source Boundaries

The critical rule is this: location truth is not social content.

Visited-site truth:

- comes from `user_dive_sites`
- `user_dive_sites` is derived from qualifying user-owned `media_posts` tagged to `dive_site_id`
- `Dive Memories`, `Journey`, `Passport`, and `Badges` must not create visited-site truth

Dive Memories:

- social and contextual
- tied to a dive site
- can include text and media
- can tag users
- do not unlock sites
- do not inflate counts

Journey:

- downstream timeline surface
- can display generated milestones
- must not mutate source modules

Passport:

- curated aggregate read model
- must not mutate source modules
- must not duplicate full child data

Badges:

- achievement and credential source
- can feed Journey and Passport previews
- must not be awarded by Journey or Passport

Posts:

- raw media/content stream
- location-tagged posts may qualify visited-site truth through backend rules
- `Posts` are not replaced by Dive Memories

## Owner Vs Visitor Rules

Owner may see:

- edit profile controls
- create/edit/delete manual Journey notes
- create Dive Memory posts where the flow is owner-only
- `Customize Passport`
- owner-specific empty prompts
- private content where allowed

Visitor may see:

- public profile content
- public Posts
- public Badges
- public Diving info
- public Dive Memories
- public Journey entries
- public Passport showcase

Visitor must not see:

- owner-only edit/create/delete controls
- private memories
- private Journey notes
- `Customize Passport` controls
- hidden Passport sections

Own-profile behavior:

- `Follow` and `Message` controls should be hidden when viewing your own profile
- edit/customize controls should appear only where appropriate

## Mobile Implementation Guidance

When implementing the equivalent experience in `apps/mobile`, do not blindly copy the web layout.

Mobile priorities:

- compact headers
- clear tab navigation
- media-first experiences
- bottom sheets or dialogs for create, edit, and customize flows
- minimal card weight
- no developer-facing copy
- strong owner vs visitor separation
- source-boundary correctness

Recommended mobile patterns:

- `Posts`: existing mobile profile/feed media grid
- `Badges`: categorized badge grid/list
- `Diving`: compact overview/presence
- `Dive Memories`: location list or map entry into a site memory page
- Dive Memories site page: compact site header, `Media` and `Posts` tabs, masonry/grid media, owner create/share control, viewer/sheet for media interactions
- `Journey`: compact timeline with add/edit note in modal or sheet
- `Passport`: compact hero, highlights, dive footprint, story preview, and Customize Passport in a sheet

## Explicit Non-Negotiables

- do not remove `Posts`
- do not replace `Posts` with `Dive Memories`
- do not make `Dive Memories` a generic top-level feed
- do not derive location markers from `Dive Memories`
- do not derive location markers from `Journey`
- do not derive location markers from `Passport`
- do not derive location markers from `Badges`
- do not let shared/tagged memories unlock locations
- do not let `Journey` or `Passport` mutate source modules
- do not expose raw dive-site UUID inputs in user-facing create flows
- do not hardcode Google Maps secrets
- do not touch legacy `apps/api`
- do not expose owner controls to visitors
- do not use heavy `proof-backed` wording in user-facing Dive Memories UI

## Current Known Web Status

The current web state should be treated as the reference implementation direction, not as blanket proof that every unrelated web test is green.

Current known status:

- the profile tab set currently renders `Posts`, `Badges`, `Diving`, `Dive Memories`, `Dive Journey`, and `Dive Passport`
- the `Dive Memories` tab currently renders through the existing profile Dive Map/read-model seam, so presentation naming and source ownership are intentionally not the same concern
- the dedicated slug-based route exists at `/dive-memories/[entrySlug]/[username]`
- the location page no longer depends on fetching the full location list and filtering client-side
- Dive Memories direction remains: `Media` and `Posts` split, no separate `Proof` tab, site-scoped create flow, and lighter user-facing copy
- Journey supports generated and manual timeline entries and is moving toward compact rows plus dialog-based note editing
- Passport uses aggregate visibility shaping, `featuredBadgeIds` curation, owner-only customize flow, and hero/highlights/footprint/story composition

Verification references from recent profile work:

- Dive Memories targeted checks passed in the documented rollout: profile dive memories contract coverage, shared contract coverage, web type-check, web lint, and `git diff --check`
- Dive Passport status is grounded by current repo inspection plus the shared dive-passport contract tests and current owner-only customize surface
- full `apps/web` or repo-wide green must not be claimed unless rerun and actually verified for that broader scope

## Future Implementation Constraints

- mobile must preserve one-way ownership boundaries from the web/backend model
- mobile may adapt navigation and presentation, but must not invent new truth sources
- route, DTO, and tab naming should stay coherent when web copy evolves
- if the web and canon drift, fix canon when durable truth is clear instead of letting mobile copy stale assumptions
- if a future implementation needs broader source changes, update this canon and the owning module canon in the same task
