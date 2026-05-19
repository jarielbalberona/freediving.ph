# Freediving Philippines Linear Ticket Map

This structure is based on repo truth, not old planning fiction.

Initiative:
- Freediving Philippines

Project:
- FPH Go Live

## Parent 1. Platform Foundations

### Why this exists

The repo has real backend architecture, but verification discipline and route truth are not clean. That is the first blocker.

### Done means

- Backend verification is green for launch-critical packages.
- Route surface and docs are current.
- Canonical auth/session/route usage is unambiguous.

### Explicitly out of scope

- Large refactors with no launch value
- New feature work unrelated to launch blockers

### Child tickets

#### 1.1 Resolve current `fphgo` verification drift

- Type: hardening
- Problem: backend verification must be green from the current checkout before launch
- Scope:
  - update route snapshot intentionally or fix unintended route drift
  - rerun feed strategy checks to confirm the prior fix still holds
- Acceptance criteria:
  - `go test ./internal/app ./internal/features/...` passes
  - route snapshot reflects actual intended route surface
  - feed strategy tests remain aligned with current intended labels and context strings
- Dependencies: none
- Evidence:
  - `services/fphgo/internal/app/routes_snapshot_test.go`
  - `services/fphgo/internal/features/feed/service/strategy_test.go`

#### 1.2 Clean up route/session truth and deprecate duplicate surfaces

- Type: fix
- Problem: auth/session and route surfaces are more confusing than necessary
- Scope:
  - document canonical session endpoint
  - remove or clearly deprecate duplicate/legacy route paths where safe
- Acceptance criteria:
  - one documented canonical session path is used by web
  - legacy route exceptions are justified or removed
  - audit docs stay accurate
- Dependencies: 1.1
- Evidence:
  - `services/fphgo/internal/app/routes.go`
  - `services/fphgo/internal/features/auth/http/routes.go`
  - `apps/web/src/features/auth/session/use-session.ts`

#### 1.3 Fix command/documentation drift for release checks

- Type: debt
- Problem: repo docs say `typecheck`, package scripts use `type-check`
- Scope:
  - align launch docs and AGENTS/plan instructions with actual scripts
- Acceptance criteria:
  - launch docs reference commands that actually exist
  - no critical release doc points to a nonexistent script
- Dependencies: none
- Evidence:
  - `AGENTS.md`
  - `apps/web/package.json`
  - `packages/types/package.json`

## Parent 2. Profiles & Identity

### Why this exists

Profiles are real and central. The fake launch tabs are gone, but the public route and edit story still carry compatibility clutter.

### Done means

- `/{username}` is the clear public profile route
- profile edit and avatar flow work
- launch scope does not expose fake profile tabs

### Explicitly out of scope

- profile video feature
- tagged discovery

### Child tickets

#### 2.1 Lock `/{username}` as the canonical profile route

- Type: fix
- Problem: profile routing still carries legacy seams
- Scope:
  - keep `/profile` as private redirect only
  - keep compatibility redirects only where necessary
  - make nav and profile links consistently point to `/{username}`
- Acceptance criteria:
  - all public profile links resolve to `/{username}`
  - no main-nav public profile link points to legacy public routes
- Dependencies: 1.2
- Evidence:
  - `apps/web/src/app/[username]/page.tsx`
  - `apps/web/src/app/profile/page.tsx`
  - `apps/web/src/app/profile/[username]/page.tsx`
  - `apps/web/src/lib/routes.ts`

#### 2.2 Remove fake profile tabs from launch scope

- Type: fix
- Problem: videos/saved/tagged tabs are placeholders
- Scope:
  - hide or clearly defer tabs that are not real
- Acceptance criteria:
  - launch profile UI does not expose nonfunctional tabs as if they are live
- Dependencies: none
- Evidence:
  - `apps/web/src/features/profile/components/ProfileTabs.tsx`

#### 2.3 Verify avatar upload and profile patch flow in target env

- Type: hardening
- Problem: avatar upload relies on storage config being correct at runtime
- Scope:
  - verify crop -> upload -> profile patch -> readback
- Acceptance criteria:
  - avatar upload succeeds in the target environment
  - persisted avatar renders on profile/settings and public profile
- Dependencies: 9.1
- Evidence:
  - `apps/web/src/app/profile/settings/page.tsx`
  - `services/fphgo/internal/features/media/service/service.go`
  - `services/fphgo/internal/features/profiles/service/service.go`

## Parent 3. Profile Media

### Why this exists

Profile media is one of the strongest visible features and should stay that way.

### Done means

- profile photo publish flow works
- masonry gallery works
- media URL minting and readback are reliable

### Explicitly out of scope

- videos
- advanced editing/reordering

### Child tickets

#### 3.1 Smoke-test profile media publish and gallery read path

- Type: hardening
- Problem: good code is not enough if storage or signed URLs fail in deployment
- Scope:
  - upload multiple photos
  - publish grouped media post
  - read gallery and open viewer
- Acceptance criteria:
  - media post is created successfully
  - gallery shows uploaded items with valid signed URLs
  - viewer opens without broken media references
- Dependencies: 9.1
- Evidence:
  - `apps/web/src/features/media/components/ProfileMediaComposer.tsx`
  - `apps/web/src/features/profile/components/ProfileGrid.tsx`
  - `services/fphgo/internal/features/media/http/routes.go`

## Parent 4. Messaging

### Why this exists

Messaging is close enough to be worth launching, but the request flow is incomplete on the web.

### Done means

- thread list/detail/send/read works
- request-gated first contact has a real recipient-side resolution flow
- realtime path is stable enough for launch

### Explicitly out of scope

- advanced moderation tooling for messages
- multi-device deep sync polish

### Child tickets

#### 4.1 Add recipient-side accept/decline controls for message requests

- Type: feature
- Problem: request-category messaging exists in backend but not as a complete user flow in web
- Scope:
  - show request state in thread list/detail
  - add accept and decline actions
- Acceptance criteria:
  - recipient can accept or decline a request thread from the web UI
  - accepted requests move into normal messaging flow
  - declined requests are visibly resolved
- Dependencies: 1.1
- Evidence:
  - `services/fphgo/internal/features/messaging/service/service.go`
  - `apps/web/src/features/messages/components/MessagingView.tsx`

#### 4.2 Run launch smoke checks for thread open/send/read/realtime

- Type: hardening
- Problem: messaging code exists, but launch confidence needs a real smoke pass
- Scope:
  - open direct thread
  - send message
  - mark read
  - verify realtime receives updates
- Acceptance criteria:
  - critical messaging flow is manually or automatically smoke-tested in target env
- Dependencies: 4.1
- Evidence:
  - `services/fphgo/internal/realtime/ws/*.go`
  - `apps/web/src/features/messages/hooks/realtime.ts`

## Parent 5. Explore Dive Sites & Buddy Finder

### Why this exists

This is the differentiator. The main Explore page now uses real `fphgo` data, so the remaining launch-truth risk is detail-route fallback behavior and end-to-end smoke coverage.

### Done means

- `/explore` uses real `fphgo` data
- site detail and buddy preview use consistent identifiers
- site-linked buddy behavior is visible to users

### Explicitly out of scope

- explore over-polish
- advanced map UX beyond MVP truth

### Child tickets

#### 5.1 Verify real Explore list/map uses `fphgo` site APIs

- Type: verification
- Problem: main Explore previously used mock data; current launch scope depends on preserving the real backend contract
- Scope:
  - confirm `features/explore/api/exploreApi.ts` delegates to `features/diveSpots/api/explore-v1.ts`
  - confirm save state uses backend save/unsave endpoints
- Acceptance criteria:
  - `/explore` list and map show data from `fphgo`
  - query/filter behavior works against backend responses
  - no mock-only save state remains on the primary path
- Dependencies: current checkout verification
- Evidence:
  - `apps/web/src/features/explore/components/ExploreLayout.tsx`
  - `apps/web/src/features/explore/api/exploreApi.ts`
  - `apps/web/src/features/diveSpots/api/explore-v1.ts`
  - `services/fphgo/internal/features/explore/http/routes.go`

#### 5.2 Keep Explore id/slug contract and broken links fixed

- Type: verification
- Problem: the route is slug-based and must not regress to id-as-slug coupling
- Scope:
  - confirm list cards and share URLs use the site slug
  - confirm detail route fetches by slug
- Acceptance criteria:
  - Explore cards and share links resolve correctly
  - route param naming matches actual data semantics
- Dependencies: 5.1
- Evidence:
  - `apps/web/src/features/explore/components/ExploreLayout.tsx`
  - `apps/web/src/app/explore/sites/[slug]/page.tsx`

#### 5.3 Remove Explore seeded/mock detail fallback

- Type: fix
- Problem: `/explore/sites/[slug]` can look real even when the backend detail fetch failed
- Scope:
  - remove `getMockDiveSpotBySlug` and mock-data imports from the public detail route
  - delete the unused Explore mock-data module if no launch imports remain
  - add a static web contract test that rejects mock detail fallback
- Acceptance criteria:
  - backend detail success renders the real site
  - backend detail failure calls `notFound()`
  - buddy preview failure remains non-fatal
  - `rg -n "Mock explore|getMockDiveSpotBySlug|MOCK_EXPLORE_SPOTS|mock-data" apps/web/src` returns no launch source matches
- Dependencies: 5.1, 5.2
- Evidence:
  - `apps/web/src/app/explore/sites/[slug]/page.tsx`
  - `apps/web/test/explore-detail-truth-contract.test.mjs`

#### 5.4 Make site-linked Buddy Finder flow explicit from Explore

- Type: fix
- Problem: backend supports site-linked + area fallback, but the main user journey still hides that advantage
- Scope:
  - expose site-linked create/contact path from real Explore detail
- Acceptance criteria:
  - user can understand and use site-linked buddy intent behavior from Explore
  - site-linked and area-fallback behavior is visible and testable
- Dependencies: 5.1, 5.2, 5.3
- Evidence:
  - `services/fphgo/internal/features/buddyfinder/service/service.go`
  - `apps/web/src/app/explore/sites/[slug]/page.tsx`
  - `apps/web/src/app/buddies/page.tsx`

## Parent 6. Groups & Events

### Why this exists

Both features are real enough to matter, but the restricted-access/admin stories are incomplete.

### Done means

- launch scope is honest
- restricted-access behavior is either supported or removed from promise

### Explicitly out of scope

- full-blown group/event moderation suite

### Child tickets

#### 6.1 Narrow or finish restricted group membership flow

- Type: fix
- Problem: approval/invite-only language exists without a full lifecycle
- Scope:
  - either implement approval/invite management or narrow launch scope to supported policies
- Acceptance criteria:
  - launch UI does not promise unsupported restricted group management
  - group membership outcomes are explainable and usable
- Dependencies: none
- Evidence:
  - `services/fphgo/internal/features/groups/http/routes.go`
  - `apps/web/src/app/groups/page.tsx`
  - `apps/web/src/app/groups/[id]/page.tsx`

#### 6.2 Remove dead event sample artifacts and verify event launch path

- Type: hardening
- Problem: event code is real, but dead sample files and absent tests weaken confidence
- Scope:
  - remove dead sample file
  - verify list/detail/create/join flows
- Acceptance criteria:
  - dead sample artifact is removed
  - event flow is smoke-tested in target env
- Dependencies: 1.1
- Evidence:
  - `apps/web/src/app/events/data.ts`
  - `apps/web/src/app/events/page.tsx`
  - `apps/web/src/app/events/[id]/page.tsx`
  - `services/fphgo/internal/features/events/http/routes.go`

## Parent 7. Chika Forums

### Why this exists

Chika is mostly real and can launch, but only if moderation and pseudonym rules are treated seriously.

### Done means

- thread/comment/reaction flows work
- pseudonymous privacy behavior is verified
- report/moderation basics are ready operationally

### Explicitly out of scope

- advanced forum tooling

### Child tickets

#### 7.1 Verify Chika pseudonym + moderation launch behavior

- Type: hardening
- Problem: this feature is privacy-sensitive and cannot rely on assumption
- Scope:
  - verify member vs moderator payload differences
  - verify hidden content behavior
  - verify report path is available for launch
- Acceptance criteria:
  - pseudonymous author identity is hidden from normal members
  - moderators retain intended visibility
  - report/moderation basic path is documented for operations
- Dependencies: none
- Evidence:
  - `services/fphgo/internal/features/chika/http/integration_blocks_test.go`
  - `apps/web/src/app/chika/[id]/page.tsx`
  - `services/fphgo/internal/features/reports/*`

## Parent 8. Feed / Homepage

### Why this exists

The homepage is real, but test drift means it is not stable enough to trust blindly.

### Done means

- feed tests are green
- homepage behavior is consistent with intended product framing

### Explicitly out of scope

- recommendation-engine expansion

### Child tickets

#### 8.1 Stabilize feed strategy contract and homepage framing

- Type: fix
- Problem: feed strategy tests are failing
- Scope:
  - align feed copy/labels/context with intended tests or update tests to intended behavior
- Acceptance criteria:
  - feed strategy tests pass
  - homepage mode framing remains intentional and launch-worthy
- Dependencies: 1.1
- Evidence:
  - `services/fphgo/internal/features/feed/service/service.go`
  - `services/fphgo/internal/features/feed/service/strategy_test.go`
  - `apps/web/src/features/home-feed/components/HomeFeedPage.tsx`

## Parent 9. Go-Live Hardening

### Why this exists

Launch failure will come from environment, storage, and operational blindness faster than from a missing gradient.

### Done means

- env requirements are explicit
- storage is verified
- smoke checks exist
- obviously fake routes are out of launch navigation

### Explicitly out of scope

- full observability platform buildout

### Child tickets

#### 9.1 Add launch smoke checklist for auth, media, messaging, explore, and community flows

- Type: hardening
- Problem: there is no concise launch smoke path grounded in the actual product
- Scope:
  - define and run critical path smoke checks
- Acceptance criteria:
  - smoke checklist exists in repo docs
  - checklist covers auth, avatar/media, messaging, explore, buddies, chika, groups/events as applicable
- Dependencies: 1.1, 5.1, 5.2, 4.1
- Evidence:
  - `services/fphgo/README.md`
  - `render.yaml`
  - `docs/go-live/fph-current-state-audit.md`

#### 9.2 Enforce storage/media readiness before launch

- Type: hardening
- Problem: storage misconfiguration will only show up when users attempt uploads unless explicitly checked
- Scope:
  - validate required envs and successful media flow in deploy target
- Acceptance criteria:
  - upload + URL mint + readback works in target env
  - launch checklist marks storage verified or launch blocked
- Dependencies: 3.1
- Evidence:
  - `services/fphgo/internal/config/config.go`
  - `services/fphgo/internal/features/media/service/service.go`
  - `render.yaml`

#### 9.3 Keep non-launch fake routes hidden from nav

- Type: verification
- Problem: navigation must not advertise surfaces that are not actually launch-ready
- Scope:
  - keep Competitive Records and other coming-soon routes hidden from public launch nav
  - keep middleware redirecting direct hits to `/coming-soon`
- Acceptance criteria:
  - launch nav does not advertise nonfunctional or UI-only pages as real product areas
  - Competitive Records remains explicitly deferred until a real `fphgo` backend exists
- Dependencies: product scope decision
- Evidence:
  - `apps/web/src/config/nav.ts`
  - `apps/web/src/app/competitive-records/page.tsx`
  - `apps/web/src/middleware.ts`

## Suggested Ordering

1. Platform Foundations
2. Explore Dive Sites & Buddy Finder
3. Messaging
4. Profiles & Identity
5. Profile Media
6. Feed / Homepage
7. Groups & Events
8. Chika Forums
9. Go-Live Hardening

## Notes

- Competitive Records should not get its own launch parent right now because the repo truth says it is not a real `fphgo` feature. The honest launch decision is to keep it deferred/hidden until someone funds and builds the backend properly.
- Explore and Buddy Finder are grouped because the backend already couples them through site-linked matching and area fallback. Splitting them too early would create ticket theater.
