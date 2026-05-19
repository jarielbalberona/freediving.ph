# Freediving Philippines Current State Audit

## Executive Summary

This repo is not vaporware, but it is not honestly go-live ready either.

- `services/fphgo` is the strongest part of the system. It has real feature packages, real migrations, real route wiring, Clerk auth, scoped permissions, SQL-backed services, and a websocket hub.
- The web app is uneven. Some surfaces are genuinely wired to `fphgo` and some are still mock-backed, placeholder-backed, or legacy-shaped.
- The biggest product lie is Explore. The share/detail route can hit real `fphgo` data, but the main map/list page still runs on mock data and local-storage saves.
- Competitive Records is not a real `fphgo` feature. It is a UI shell still calling legacy-style `/competitive-records` endpoints that do not exist in `services/fphgo`.
- Verification is not clean. `pnpm --filter @freediving.ph/types test` passed, `pnpm --filter @freediving.ph/web type-check` passed, but `go test ./internal/app ./internal/features/...` fails on a stale route snapshot and failing feed strategy assertions.

## Verification Snapshot

- `pnpm --filter @freediving.ph/types test`: passed
- `pnpm --filter @freediving.ph/web type-check`: passed
- `go test ./internal/app ./internal/features/...`: failed
  - route snapshot drift in `services/fphgo/internal/app/routes_snapshot_test.go`
  - feed strategy expectation drift in `services/fphgo/internal/features/feed/service/strategy_test.go`

## Feature Status

| Area | Status | Confidence | What exists | What is missing / broken / risky | Next action | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Auth and current-user bootstrap | Implemented but needs fixes | High | Clerk bearer auth, identity resolution, lazy local-user bootstrap, `RequireMember`, scoped permissions, session endpoint. | Session surface is duplicated (`/v1/auth/session`, `/v1/me`), bootstrap depends on live Clerk fetches, and launch confidence is reduced by mixed session usage. | Keep `fphgo` session flow as canonical and remove duplicate/confusing auth surfaces. | `services/fphgo/internal/middleware/clerk_auth.go`, `services/fphgo/internal/features/identity/service/service.go`, `services/fphgo/internal/features/auth/http/routes.go`, `apps/web/src/features/auth/session/use-session.ts` |
| Profile page UI | Implemented but needs fixes | High | Real public profile fetch, bucket list, follow/save flow, open-message flow, media-backed post grid. | Tabs for videos/saved/tagged are explicit placeholders. Old profile pathways still exist as redirects and compatibility seams. | Keep username profile as canonical and cut placeholder tabs from launch scope. | `apps/web/src/features/profile/pages/ProfilePage.tsx`, `apps/web/src/features/profile/components/ProfileTabs.tsx`, `apps/web/src/app/[username]/page.tsx`, `apps/web/src/app/profile/page.tsx` |
| Username-based routing | Implemented but needs fixes | High | Canonical `/{username}` route exists and `/profile` redirects to it. | Legacy compatibility routes still remain and make the route story messier than it should be. | Keep `/{username}` only for public profile navigation and keep `/profile` as a private redirect only. | `apps/web/src/app/[username]/page.tsx`, `apps/web/src/app/profile/page.tsx`, `apps/web/src/app/profile/[username]/page.tsx`, `apps/web/src/lib/routes.ts` |
| Profile photo upload | Implemented but needs fixes | High | Crop dialog, client-side image prep, upload to media service, then profile patch with stored media reference. | Upload hard-fails when storage is not configured. There is no graceful fallback or operator-facing readiness gate. | Treat storage readiness as a launch gate and fail it explicitly before public launch. | `apps/web/src/app/profile/settings/page.tsx`, `services/fphgo/internal/features/media/http/routes.go`, `services/fphgo/internal/features/media/service/service.go`, `services/fphgo/internal/features/profiles/service/service.go` |
| Photo storage integration | Implemented but needs fixes | High | R2 client, signed URL minting, media contexts, CDN materialization, media post schema. | Upload depends on `R2_*`, `CDN_BASE_URL`, and media signing env. Missing config degrades feature behavior to runtime failure, not graceful disable. | Add launch checklist and smoke test for R2 upload + signed URL + avatar/profile-media read. | `services/fphgo/internal/shared/storage/r2/client.go`, `services/fphgo/internal/features/media/service/service.go`, `services/fphgo/internal/config/config.go`, `render.yaml` |
| Masonry/grid profile feed | Implemented but needs fixes | High | Real masonry gallery with `react-photo-album`, paginated profile media API, viewer dialog, signed media URLs. | Grid works, but sibling tabs are fake and old public-post endpoints still linger beside the newer media flow. | Launch only the photo grid tab and defer or hide the fake tabs. | `apps/web/src/features/profile/components/ProfileGrid.tsx`, `apps/web/src/features/profile/components/ProfileTabs.tsx`, `apps/web/src/features/media/api/media.ts`, `services/fphgo/internal/features/media/http/routes.go` |
| Messaging backend | Implemented but needs fixes | Medium | Real thread model, direct thread open, message send/read/category update, block checks, buddy-aware request/pending logic, websocket hub and optional Postgres fanout. | Test suite overall is not green, and old conversation/request code still coexists with newer thread code. | Freeze on the thread model, keep tests green, and stop carrying dead messaging concepts longer than necessary. | `services/fphgo/internal/features/messaging/service/service.go`, `services/fphgo/internal/features/messaging/http/routes.go`, `services/fphgo/internal/realtime/ws/hub.go`, `services/fphgo/internal/realtime/ws/handler.go` |
| Messaging UI | Implemented but needs fixes | Medium | Real inbox, thread detail, mobile/desktop layout, read state, send flow, realtime hook. | UI shows request-category threads, but there is no visible accept/decline request workflow in the messages surface. | Add request resolution UI or stop claiming first-time request behavior is complete. | `apps/web/src/features/messages/components/MessagingView.tsx`, `apps/web/src/features/messages/api/messages.ts`, `apps/web/src/app/messages/page.tsx` |
| Message requests | Partially implemented | High | Backend clearly enforces pending-vs-active message state and request promotion rules. | Recipient-side accept/decline UI is missing from the web messaging surface. A request tab without resolution controls is not a finished product. | Ship request accept/decline UX before claiming messaging is go-live complete. | `services/fphgo/internal/features/messaging/service/service.go`, `apps/web/src/features/messages/components/MessagingView.tsx` |
| Buddy system | Implemented but needs fixes | Medium | Real buddy request create/accept/decline/cancel/remove endpoints and a web buddies screen showing buddies plus request queues. | Launch quality depends on the surrounding profile/messaging flows being reliable. No dedicated verification pass was run here. | Add targeted buddy flow smoke checks and keep request state aligned with messaging entry points. | `services/fphgo/internal/features/buddies/http/routes.go`, `apps/web/src/features/buddies/api/buddies.ts`, `apps/web/src/app/buddies/page.tsx` |
| Buddy finder | Implemented but needs fixes | High | Real preview, list, mine, create, delete, message-entry APIs; backend supports site-linked preview with area fallback. | Main web compose flow is still area-based. Site-linked behavior exists in backend and detail surfaces, but the main user journey still undersells it. | Make the site-linked path explicit from Explore and verify the fallback behavior end to end. | `services/fphgo/internal/features/buddyfinder/service/service.go`, `services/fphgo/internal/features/buddyfinder/http/routes.go`, `apps/web/src/features/buddies/api/buddy-finder.ts`, `apps/web/src/app/buddy/[intentId]/page.tsx` |
| Explore dive sites map/list | Partially implemented | High | `fphgo` has real site list/detail/update/submission/save/buddy-preview APIs. Site detail page can fetch real `fphgo` data. | Main `/explore` still uses `features/explore/api/exploreApi.ts` mock data. It also links to `/explore/sites/${spot.id}` even though the route is `[slug]`, and local saving is browser-only. | Replace mock Explore list/map with `fphgo` list APIs and fix the id/slug contract before launch. | `services/fphgo/internal/features/explore/http/routes.go`, `apps/web/src/features/explore/components/ExploreLayout.tsx`, `apps/web/src/features/explore/api/exploreApi.ts`, `apps/web/src/app/explore/sites/[slug]/page.tsx`, `apps/web/src/features/diveSpots/api/explore-v1.ts` |
| Events | Implemented but needs fixes | Medium | Real `fphgo` events routes for list/detail/create/update/join/leave/attendees. Real web list and detail pages exist. | No test coverage in `events/http` or `events/service`, and there is dead sample data under `apps/web/src/app/events/data.ts`. | Remove dead sample artifacts and add event-specific verification before launch. | `services/fphgo/internal/features/events/http/routes.go`, `services/fphgo/internal/features/events/service/service.go`, `apps/web/src/features/events/api/events.ts`, `apps/web/src/app/events/page.tsx`, `apps/web/src/app/events/[id]/page.tsx`, `apps/web/src/app/events/data.ts` |
| Competitive records | Scaffolded only | High | There is a page, form, filters, and local hooks. | There is no `services/fphgo` competitive-records feature. Web still calls legacy `/competitive-records` endpoints via axios. This is not launchable as a real feature. | Either build it properly in `fphgo` or remove it from launch navigation. | `apps/web/src/app/competitive-records/page.tsx`, `apps/web/src/features/competitiveRecords/api/competitiveRecords.ts`, `packages/types/src/index.ts` |
| Groups | Partially implemented | Medium | Real group list/detail/create/update/join/leave/member/post APIs exist and web list/detail pages use them. | Approval/invite lifecycle is incomplete. There is no explicit approve/invite moderation flow despite `approval` and `invite_only` policy language. | Narrow launch scope to public/open groups or finish restricted-membership management. | `services/fphgo/internal/features/groups/http/routes.go`, `services/fphgo/internal/features/groups/service/service.go`, `apps/web/src/features/groups/api/groups.ts`, `apps/web/src/app/groups/page.tsx`, `apps/web/src/app/groups/[id]/page.tsx` |
| Chika/forums | Implemented but needs fixes | Medium | Real categories, threads, comments, reactions, pseudonymous handling, moderator-aware hidden content, and realtime hooks. | Mixed pagination style, broader abuse/moderation readiness still needs operational hardening, and launch confidence depends on moderation/report workflows being staffed. | Keep Chika in launch scope only with moderation/reporting and pseudonym rules explicitly verified. | `services/fphgo/internal/features/chika/http/routes.go`, `services/fphgo/internal/features/chika/service/service.go`, `apps/web/src/app/chika/page.tsx`, `apps/web/src/app/chika/[id]/page.tsx`, `apps/web/src/features/chika/api/threads.server.ts` |
| Home feed | Implemented but needs fixes | High | Real `fphgo` home feed, mode framing, feed telemetry endpoints, and web home feed page. | Feed strategy tests are failing right now. If the feed contract is changing faster than tests, the launch story is unstable. | Fix feed assertions and rerun backend tests before trusting homepage behavior. | `services/fphgo/internal/features/feed/http/routes.go`, `services/fphgo/internal/features/feed/service/service.go`, `services/fphgo/internal/features/feed/service/strategy_test.go`, `apps/web/src/features/home-feed/components/HomeFeedPage.tsx` |

## Platform Layer Status

| Layer | Status | Confidence | Summary | Evidence |
| --- | --- | --- | --- | --- |
| API architecture | Implemented but needs fixes | High | `fphgo` generally follows handler/service/repo separation, shared middleware, and feature packages. | `services/fphgo/internal/app/app.go`, `services/fphgo/internal/app/routes.go`, `services/fphgo/internal/features/*` |
| Route consistency and `/v1` usage | Implemented but needs fixes | High | Most canonical routes are under `/v1`, but the router still exempts `/profiles/{username}` and duplicate session surfaces exist. The web also still calls non-`fphgo` legacy paths in some features. | `services/fphgo/internal/app/routes.go`, `services/fphgo/internal/app/routes_snapshot_test.go`, `apps/web/src/features/competitiveRecords/api/competitiveRecords.ts` |
| Clerk auth consistency | Implemented but needs fixes | High | Both fetch client and axios attach Clerk tokens, and the API resolves identity from Clerk. | `services/fphgo/internal/middleware/clerk_auth.go`, `apps/web/src/lib/http/helpers.ts`, `apps/web/src/lib/api/client.ts`, `apps/web/src/features/auth/session/use-session.ts` |
| Middleware consistency | Implemented but needs fixes | High | Request ID, request logger, recover, security headers, CORS, and rate limit are all in place. | `services/fphgo/internal/app/routes.go`, `services/fphgo/internal/middleware/request_logger.go`, `services/fphgo/internal/middleware/security_headers.go`, `services/fphgo/internal/middleware/ratelimit.go` |
| Validation usage | Implemented but needs fixes | High | Most JSON handlers use `httpx.DecodeAndValidate[T]`; multipart upload paths validate manually. | `services/fphgo/internal/shared/httpx/validate.go`, `services/fphgo/internal/features/*/http/handlers.go`, `services/fphgo/internal/features/media/http/handlers.go` |
| Handler / service / repo separation | Solid | High | The backend structure is one of the healthier parts of the repo. | `services/fphgo/internal/features/messaging/{http,service,repo}`, `services/fphgo/internal/features/explore/{http,service,repo}` |
| DB schema and migrations | Implemented but needs fixes | Medium | There is a substantial migration chain and sql-backed feature surface, but launch confidence still depends on migration verification and setup discipline. | `services/fphgo/db/migrations`, `services/fphgo/db/schema/000_schema.sql`, `services/fphgo/sqlc.yaml` |
| SQLC usage | Solid | High | SQLC is real and widely used in backend features. | `services/fphgo/sqlc.yaml`, `services/fphgo/internal/features/*/repo/sqlc` |
| Error handling | Implemented but needs fixes | High | `apperrors` + `httpx` patterns are broadly consistent in Go, but the web still mixes axios error handling and fetch-client handling. | `services/fphgo/internal/shared/errors/errors.go`, `services/fphgo/internal/shared/httpx/respond.go`, `apps/web/src/lib/http/helpers.ts`, `apps/web/src/lib/http/api-error.ts` |
| Pagination and envelope consistency | Partially implemented | High | The repo uses multiple pagination styles: cursor-based `nextCursor`, page/limit payloads, and older generic `ApiEnvelope` types. | `packages/types/src/index.ts`, `services/fphgo/internal/features/messaging/http/dto.go`, `services/fphgo/internal/features/groups/http/dto.go`, `services/fphgo/internal/features/chika/http/dto.go` |
| Websocket / realtime flow | Implemented but needs fixes | Medium | Websocket auth, hub, optional Postgres fanout, and realtime hooks exist. | `services/fphgo/internal/realtime/ws/*.go`, `apps/web/src/features/messages/hooks/realtime.ts`, `apps/web/src/features/chika/hooks` |

## Web Layer Status

| Area | Status | Confidence | Summary | Evidence |
| --- | --- | --- | --- | --- |
| Existing routes vs missing routes | Implemented but needs fixes | Medium | Core routes exist for profiles, messages, explore, buddies, groups, events, chika, and moderation. Some are still compatibility redirects or non-launch routes. | `apps/web/src/app`, `apps/web/src/config/nav.ts` |
| Mock-data-only pages | Partially implemented | High | Explore list/map is mock-backed. Competitive Records is UI-only against legacy endpoints. | `apps/web/src/features/explore/api/exploreApi.ts`, `apps/web/src/features/explore/mock-data.ts`, `apps/web/src/features/competitiveRecords/api/competitiveRecords.ts` |
| Placeholder pages and placeholder UI | Implemented but needs fixes | High | Multiple nav items are flagged `comingSoon`; profile tabs explicitly say “coming soon”. | `apps/web/src/config/nav.ts`, `apps/web/src/features/profile/components/ProfileTabs.tsx` |
| Broken links / route mismatches | Partially implemented | High | Explore links use `spot.id` even though the route is `[slug]`; mock helper treats id as slug; this is sloppy and risky. | `apps/web/src/features/explore/components/ExploreLayout.tsx`, `apps/web/src/app/explore/sites/[slug]/page.tsx`, `apps/web/src/features/explore/mock-data.ts` |
| shadcn/ui usage vs native elements | Implemented but needs fixes | Medium | The app mostly uses shared UI primitives, but there are still large page-level components with direct form/layout logic. | `apps/web/src/components/ui/*`, `apps/web/src/app/groups/page.tsx`, `apps/web/src/app/events/page.tsx` |
| Tailwind v4 token consistency | Implemented but needs fixes | Low | The app appears token-driven, but page code still leans heavily on bespoke utility strings and visual one-offs. | `apps/web/src/app/globals.css`, `apps/web/src/app/groups/page.tsx`, `apps/web/src/app/events/page.tsx` |
| Feature-based file structure compliance | Implemented but needs fixes | High | There is feature organization, but duplication exists (`profile` and `profiles`), and some app routes still carry heavy business logic directly. | `apps/web/src/features/profile`, `apps/web/src/features/profiles`, `apps/web/src/app/groups/page.tsx`, `apps/web/src/app/events/page.tsx` |
| Legacy or wrong imports | Implemented but needs fixes | High | Old README guidance is stale, Explore still has mock API wiring, and Competitive Records still points at legacy endpoints. | `apps/web/src/features/README.md`, `apps/web/src/features/explore/api/exploreApi.ts`, `apps/web/src/features/competitiveRecords/api/competitiveRecords.ts` |
| Loading / error / empty states | Implemented but needs fixes | Medium | Many primary pages have them; some feature quality still varies. | `apps/web/src/features/profile/pages/ProfilePage.tsx`, `apps/web/src/features/messages/components/MessagingView.tsx`, `apps/web/src/app/groups/[id]/page.tsx`, `apps/web/src/app/events/[id]/page.tsx` |

## Go-Live Hardening Status

| Area | Status | Confidence | Summary | Evidence |
| --- | --- | --- | --- | --- |
| Environment configuration requirements | Implemented but needs fixes | High | Env loading is explicit and production guards exist, but repo docs and scripts are not fully consistent. | `services/fphgo/internal/config/config.go`, `services/fphgo/README.md`, `render.yaml`, `env.render.example` |
| Storage configuration | Implemented but needs fixes | High | Media/storage setup is documented, but upload flows will break at runtime if R2/CDN/signing config is missing. | `services/fphgo/internal/features/media/service/service.go`, `services/fphgo/internal/shared/storage/r2/client.go`, `render.yaml` |
| Auth secrets and callback assumptions | Implemented but needs fixes | Medium | Clerk secrets are enforced in production. Web auth env is present in Render config. | `services/fphgo/internal/config/config.go`, `render.yaml` |
| Deployment assumptions | Implemented but needs fixes | Medium | Render blueprint exists for DB, API, and web. | `render.yaml`, `services/fphgo/Dockerfile`, `apps/web/package.json` |
| Observability / logging | Implemented but needs fixes | High | Structured logs, request IDs, health and readiness exist. There are no metrics/tracing and no meaningful launch smoke runbook. | `services/fphgo/internal/middleware/request_logger.go`, `services/fphgo/internal/app/routes.go`, `services/fphgo/internal/platform/logger/logger.go` |
| Moderation / abuse controls | Partially implemented | Medium | Reports, moderation actions, rate limiting, account status controls, and hidden content flows exist. Coverage is uneven across groups/events and operational moderation remains thin. | `services/fphgo/internal/features/reports/*`, `services/fphgo/internal/features/moderation_actions/*`, `services/fphgo/internal/middleware/ratelimit.go`, `services/fphgo/docs/moderation-actions-v1.md` |
| Privacy defaults | Implemented but needs fixes | Medium | Pseudonymous Chika handling, safe buddy share preview, and restricted event/group visibility exist. | `services/fphgo/internal/features/chika/http/integration_blocks_test.go`, `apps/web/src/app/buddy/[intentId]/page.tsx`, `services/fphgo/internal/features/events/service/service.go`, `services/fphgo/internal/features/groups/service/service.go` |
| Failure cases that block public launch | Implemented but needs fixes | High | There are clear blockers: mock Explore, fake Competitive Records, missing message-request acceptance UI, non-green backend tests, and storage readiness not enforced operationally. | see blockers below |

## Go-Live Blockers

1. Explore is not truthful on the main user path.
   - The main `/explore` experience still runs on mock data and local browser state.
   - Evidence: `apps/web/src/features/explore/api/exploreApi.ts`, `apps/web/src/features/explore/components/ExploreLayout.tsx`

2. Explore route contract is sloppy.
   - The UI links by `spot.id` while the route is named `[slug]`.
   - Evidence: `apps/web/src/features/explore/components/ExploreLayout.tsx`, `apps/web/src/app/explore/sites/[slug]/page.tsx`

3. Competitive Records is not implemented in the canonical backend.
   - It still points at legacy `/competitive-records` endpoints.
   - Evidence: `apps/web/src/features/competitiveRecords/api/competitiveRecords.ts`, absence of `services/fphgo/internal/features/competitive_records`

4. Messaging request behavior is incomplete in the web app.
   - The backend has request-state logic, but the inbox UI does not expose accept/decline resolution.
   - Evidence: `services/fphgo/internal/features/messaging/service/service.go`, `apps/web/src/features/messages/components/MessagingView.tsx`

5. Backend verification is not green.
   - Route snapshot and feed strategy tests are failing.
   - Evidence: `services/fphgo/internal/app/routes_snapshot_test.go`, `services/fphgo/internal/features/feed/service/strategy_test.go`

6. Groups restricted-membership flow is incomplete.
   - The product language supports approval/invite-only policies, but the management workflow is incomplete.
   - Evidence: `services/fphgo/internal/features/groups/http/routes.go`, `apps/web/src/app/groups/page.tsx`

7. Media launch depends on configuration that is not operationally verified in-repo.
   - Avatar/profile media launch should not rely on “hope the env is right”.
   - Evidence: `services/fphgo/internal/features/media/service/service.go`, `render.yaml`, `env.render.example`

## Non-Blocking Debt

- Dead sample file under events: `apps/web/src/app/events/data.ts`
- Stale feature architecture README: `apps/web/src/features/README.md`
- Duplicate or compatibility routes that should eventually be collapsed:
  - `apps/web/src/app/profile/page.tsx`
  - `apps/web/src/app/profile/[username]/page.tsx`
  - `services/fphgo/internal/app/routes.go` legacy `/profiles/{username}`
- Profile tabs that should not be visible if they are not real:
  - `apps/web/src/features/profile/components/ProfileTabs.tsx`
- Mixed pagination/envelope contracts that complicate frontend correctness:
  - `packages/types/src/index.ts`
  - `services/fphgo/internal/features/groups/http/dto.go`
  - `services/fphgo/internal/features/messaging/http/dto.go`

## Evidence Appendix

### Backend routing and architecture

- `services/fphgo/internal/app/app.go`
- `services/fphgo/internal/app/routes.go`
- `services/fphgo/internal/app/routes_snapshot_test.go`
- `services/fphgo/internal/shared/httpx/validate.go`
- `services/fphgo/internal/shared/errors/errors.go`

### Auth / identity

- `services/fphgo/internal/middleware/clerk_auth.go`
- `services/fphgo/internal/features/auth/http/routes.go`
- `services/fphgo/internal/features/identity/service/service.go`
- `apps/web/src/features/auth/session/use-session.ts`

### Profiles / media

- `apps/web/src/app/[username]/page.tsx`
- `apps/web/src/app/[username]/create/page.tsx`
- `apps/web/src/app/profile/page.tsx`
- `apps/web/src/app/profile/settings/page.tsx`
- `apps/web/src/features/profile/pages/ProfilePage.tsx`
- `apps/web/src/features/profile/components/ProfileTabs.tsx`
- `apps/web/src/features/profile/components/ProfileGrid.tsx`
- `apps/web/src/features/media/api/media.ts`
- `services/fphgo/internal/features/media/http/routes.go`
- `services/fphgo/internal/features/media/service/service.go`
- `services/fphgo/internal/features/profiles/http/routes.go`
- `services/fphgo/internal/features/profiles/service/service.go`

### Messaging

- `apps/web/src/app/messages/page.tsx`
- `apps/web/src/app/messages/[threadId]/page.tsx`
- `apps/web/src/features/messages/components/MessagingView.tsx`
- `apps/web/src/features/messages/api/messages.ts`
- `apps/web/src/features/messages/hooks/realtime.ts`
- `services/fphgo/internal/features/messaging/http/routes.go`
- `services/fphgo/internal/features/messaging/service/service.go`
- `services/fphgo/internal/realtime/ws/handler.go`
- `services/fphgo/internal/realtime/ws/hub.go`

### Explore / buddies

- `apps/web/src/features/explore/api/exploreApi.ts`
- `apps/web/src/features/explore/components/ExploreLayout.tsx`
- `apps/web/src/features/explore/mock-data.ts`
- `apps/web/src/app/explore/sites/[slug]/page.tsx`
- `apps/web/src/features/diveSpots/api/explore-v1.ts`
- `apps/web/src/features/diveSpots/api/explore-v1.server.ts`
- `apps/web/src/app/buddies/page.tsx`
- `apps/web/src/app/buddy/[intentId]/page.tsx`
- `services/fphgo/internal/features/explore/http/routes.go`
- `services/fphgo/internal/features/explore/service/service.go`
- `services/fphgo/internal/features/buddyfinder/http/routes.go`
- `services/fphgo/internal/features/buddyfinder/service/service.go`
- `services/fphgo/internal/features/buddies/http/routes.go`

### Groups / events / chika / feed

- `apps/web/src/app/groups/page.tsx`
- `apps/web/src/app/groups/[id]/page.tsx`
- `apps/web/src/features/groups/api/groups.ts`
- `apps/web/src/app/events/page.tsx`
- `apps/web/src/app/events/[id]/page.tsx`
- `apps/web/src/features/events/api/events.ts`
- `apps/web/src/app/chika/page.tsx`
- `apps/web/src/app/chika/[id]/page.tsx`
- `apps/web/src/features/chika/api/threads.server.ts`
- `apps/web/src/features/home-feed/components/HomeFeedPage.tsx`
- `services/fphgo/internal/features/groups/http/routes.go`
- `services/fphgo/internal/features/events/http/routes.go`
- `services/fphgo/internal/features/chika/http/routes.go`
- `services/fphgo/internal/features/chika/http/integration_blocks_test.go`
- `services/fphgo/internal/features/feed/http/routes.go`
- `services/fphgo/internal/features/feed/service/service.go`
- `services/fphgo/internal/features/feed/service/strategy_test.go`

### Deployment / ops

- `services/fphgo/internal/config/config.go`
- `services/fphgo/internal/middleware/request_logger.go`
- `services/fphgo/internal/middleware/ratelimit.go`
- `services/fphgo/README.md`
- `services/fphgo/docs/production-grade.md`
- `render.yaml`
- `env.render.example`
