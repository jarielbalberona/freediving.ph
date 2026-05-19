# Freediving Philippines Current State Audit

## Executive Summary

This repo is not vaporware, but it is not honestly go-live ready either.

- `services/fphgo` is the strongest part of the system. It has real feature packages, real migrations, real route wiring, Clerk auth, scoped permissions, SQL-backed services, and a websocket hub.
- The web app is uneven. The launch-visible surfaces are much cleaner than the first audit, but some legacy-shaped/deferred pages still exist behind coming-soon routing.
- Explore is now on the real `fphgo` list/detail contract. The remaining launch-truth gate is that `/explore/sites/[slug]` must never fall back to seeded/mock detail content; missing backend records must return the normal not-found path.
- Competitive Records is not a real `fphgo` feature. It remains intentionally deferred and hidden from launch navigation/entry by coming-soon routing.
- Verification must be rerun from a clean local install/toolchain before final go-live signoff. Prior shared-branch execution logs show targeted checks passing, but this audit should not be treated as live runtime proof.

## Verification Snapshot

- Prior targeted checks are recorded in `docs/go-live/fph-execution-log.md`.
- Current signoff still requires rerunning:
  - `pnpm --filter @freediving.ph/types test`
  - `pnpm --filter @freediving.ph/web type-check`
  - `pnpm --filter @freediving.ph/web test`
  - `cd services/fphgo && go test ./internal/app ./internal/features/...`

## Feature Status

| Area | Status | Confidence | What exists | What is missing / broken / risky | Next action | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Auth and current-user bootstrap | Implemented but needs fixes | High | Clerk bearer auth, identity resolution, lazy local-user bootstrap, `RequireMember`, scoped permissions, session endpoint. | Session surface is duplicated (`/v1/auth/session`, `/v1/me`), bootstrap depends on live Clerk fetches, and launch confidence is reduced by mixed session usage. | Keep `fphgo` session flow as canonical and remove duplicate/confusing auth surfaces. | `services/fphgo/internal/middleware/clerk_auth.go`, `services/fphgo/internal/features/identity/service/service.go`, `services/fphgo/internal/features/auth/http/routes.go`, `apps/web/src/features/auth/session/use-session.ts` |
| Profile page UI | Launch-scope implemented | High | Real public profile fetch, bucket list, follow/save flow, open-message flow, and media-backed post grid. Fake videos/saved/tagged tabs have been removed from the launch UI. | Old profile pathways still exist as redirects and compatibility seams. | Keep `/{username}` as canonical and leave deeper tab features deferred. | `apps/web/src/features/profile/pages/ProfilePage.tsx`, `apps/web/src/features/profile/components/ProfileTabs.tsx`, `apps/web/src/app/[username]/page.tsx`, `apps/web/src/app/profile/page.tsx` |
| Username-based routing | Implemented but needs fixes | High | Canonical `/{username}` route exists and `/profile` redirects to it. | Legacy compatibility routes still remain and make the route story messier than it should be. | Keep `/{username}` only for public profile navigation and keep `/profile` as a private redirect only. | `apps/web/src/app/[username]/page.tsx`, `apps/web/src/app/profile/page.tsx`, `apps/web/src/app/profile/[username]/page.tsx`, `apps/web/src/lib/routes.ts` |
| Profile photo upload | Implemented but needs fixes | High | Crop dialog, client-side image prep, upload to media service, then profile patch with stored media reference. | Upload hard-fails when storage is not configured. There is no graceful fallback or operator-facing readiness gate. | Treat storage readiness as a launch gate and fail it explicitly before public launch. | `apps/web/src/app/profile/settings/page.tsx`, `services/fphgo/internal/features/media/http/routes.go`, `services/fphgo/internal/features/media/service/service.go`, `services/fphgo/internal/features/profiles/service/service.go` |
| Photo storage integration | Implemented with production guardrails | High | R2 client, signed URL minting, media contexts, CDN materialization, media post schema, and production config startup checks. | Real deploy-time upload/readback still needs smoke verification with target R2/CDN/Clerk env. | Run launch smoke for R2 upload + signed URL + avatar/profile-media read. | `services/fphgo/internal/shared/storage/r2/client.go`, `services/fphgo/internal/features/media/service/service.go`, `services/fphgo/internal/config/config.go`, `render.yaml` |
| Masonry/grid profile feed | Launch-scope implemented | High | Real masonry gallery with `react-photo-album`, paginated profile media API, viewer dialog, signed media URLs, and no fake sibling tabs in launch UI. | Old public-post endpoints still linger beside the newer media flow. | Keep launch scope to the photo grid and defer videos/saved/tagged. | `apps/web/src/features/profile/components/ProfileGrid.tsx`, `apps/web/src/features/profile/components/ProfileTabs.tsx`, `apps/web/src/features/media/api/media.ts`, `services/fphgo/internal/features/media/http/routes.go` |
| Messaging backend | Implemented but needs fixes | Medium | Real thread model, direct thread open, message send/read/category update, block checks, buddy-aware request/pending logic, websocket hub and optional Postgres fanout. | Test suite overall is not green, and old conversation/request code still coexists with newer thread code. | Freeze on the thread model, keep tests green, and stop carrying dead messaging concepts longer than necessary. | `services/fphgo/internal/features/messaging/service/service.go`, `services/fphgo/internal/features/messaging/http/routes.go`, `services/fphgo/internal/realtime/ws/hub.go`, `services/fphgo/internal/realtime/ws/handler.go` |
| Messaging UI | Implemented but needs smoke verification | Medium | Real inbox, thread detail, mobile/desktop layout, read state, send flow, realtime hook, and recipient-side accept/decline controls for requests. | Launch confidence still depends on a real thread open/send/read/realtime smoke pass. | Smoke-test messaging in the target environment. | `apps/web/src/features/messages/components/MessagingView.tsx`, `apps/web/src/features/messages/api/messages.ts`, `apps/web/src/app/messages/page.tsx` |
| Message requests | Launch-scope implemented | High | Backend enforces pending-vs-active request state, and the web exposes accept/decline controls before reply. | Needs final manual/automated smoke across two real users. | Verify accept, decline, and reply-after-accept behavior. | `services/fphgo/internal/features/messaging/service/service.go`, `apps/web/src/features/messages/components/MessagingView.tsx` |
| Buddy system | Implemented but needs fixes | Medium | Real buddy request create/accept/decline/cancel/remove endpoints and a web buddies screen showing buddies plus request queues. | Launch quality depends on the surrounding profile/messaging flows being reliable. No dedicated verification pass was run here. | Add targeted buddy flow smoke checks and keep request state aligned with messaging entry points. | `services/fphgo/internal/features/buddies/http/routes.go`, `apps/web/src/features/buddies/api/buddies.ts`, `apps/web/src/app/buddies/page.tsx` |
| Buddy finder | Implemented but needs fixes | High | Real preview, list, mine, create, delete, message-entry APIs; backend supports site-linked preview with area fallback. | Main web compose flow is still area-based. Site-linked behavior exists in backend and detail surfaces, but the main user journey still undersells it. | Make the site-linked path explicit from Explore and verify the fallback behavior end to end. | `services/fphgo/internal/features/buddyfinder/service/service.go`, `services/fphgo/internal/features/buddyfinder/http/routes.go`, `apps/web/src/features/buddies/api/buddy-finder.ts`, `apps/web/src/app/buddy/[intentId]/page.tsx` |
| Explore dive sites map/list | Implemented with final truth gate | High | Main `/explore` uses the real `fphgo` site list, slug links, backend save endpoints, detail fetch, and buddy preview. | Public site detail must not fall back to seeded/mock content when backend detail fails. | Enforce real-data-or-404 behavior and keep a static contract test for it. | `services/fphgo/internal/features/explore/http/routes.go`, `apps/web/src/features/explore/components/ExploreLayout.tsx`, `apps/web/src/features/explore/api/exploreApi.ts`, `apps/web/src/app/explore/sites/[slug]/page.tsx`, `apps/web/src/features/diveSpots/api/explore-v1.ts` |
| Events | Implemented but needs fixes | Medium | Real `fphgo` events routes for list/detail/create/update/join/leave/attendees. Real web list and detail pages exist. | No test coverage in `events/http` or `events/service`, and there is dead sample data under `apps/web/src/app/events/data.ts`. | Remove dead sample artifacts and add event-specific verification before launch. | `services/fphgo/internal/features/events/http/routes.go`, `services/fphgo/internal/features/events/service/service.go`, `apps/web/src/features/events/api/events.ts`, `apps/web/src/app/events/page.tsx`, `apps/web/src/app/events/[id]/page.tsx`, `apps/web/src/app/events/data.ts` |
| Competitive records | Deferred | High | There is a page, form, filters, and local hooks, but the route is hidden/redirected as coming soon. | There is no `services/fphgo` competitive-records feature. Web still calls legacy `/competitive-records` endpoints, so it must stay out of launch scope. | Do not build this for go-live; keep it hidden until a real backend exists. | `apps/web/src/app/competitive-records/page.tsx`, `apps/web/src/features/competitiveRecords/api/competitiveRecords.ts`, `apps/web/src/middleware.ts` |
| Groups | Launch scope narrowed | Medium | Real group list/detail/create/update/join/leave/member/post APIs exist and web list/detail pages use them. Restricted behavior has been narrowed so the UI does not promise approval queues that are not implemented. | Needs final smoke against open and invite-required groups. | Verify narrowed group flows in target env. | `services/fphgo/internal/features/groups/http/routes.go`, `services/fphgo/internal/features/groups/service/service.go`, `apps/web/src/app/groups/page.tsx`, `apps/web/src/app/groups/[id]/page.tsx` |
| Chika/forums | Implemented but needs fixes | Medium | Real categories, threads, comments, reactions, pseudonymous handling, moderator-aware hidden content, and realtime hooks. | Mixed pagination style, broader abuse/moderation readiness still needs operational hardening, and launch confidence depends on moderation/report workflows being staffed. | Keep Chika in launch scope only with moderation/reporting and pseudonym rules explicitly verified. | `services/fphgo/internal/features/chika/http/routes.go`, `services/fphgo/internal/features/chika/service/service.go`, `apps/web/src/app/chika/page.tsx`, `apps/web/src/app/chika/[id]/page.tsx`, `apps/web/src/features/chika/api/threads.server.ts` |
| Home feed | Implemented, needs final verification | High | Real `fphgo` home feed, mode framing, feed telemetry endpoints, and web home feed page. Prior execution log shows targeted feed service checks passing. | Needs final rerun from current checkout/toolchain. | Rerun feed and homepage checks during final go-live verification. | `services/fphgo/internal/features/feed/http/routes.go`, `services/fphgo/internal/features/feed/service/service.go`, `services/fphgo/internal/features/feed/service/strategy_test.go`, `apps/web/src/features/home-feed/components/HomeFeedPage.tsx` |

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
| Mock-data-only pages | Mostly contained | High | Competitive Records is UI-only against legacy endpoints, but it is hidden/redirected as coming soon. Explore list/map is no longer mock-backed. | `apps/web/src/middleware.ts`, `apps/web/src/features/competitiveRecords/api/competitiveRecords.ts`, `apps/web/src/features/explore/api/exploreApi.ts` |
| Placeholder pages and placeholder UI | Contained | High | Coming-soon routes are hidden from launch navigation and redirected by middleware. Profile fake tabs have been removed from launch UI. | `apps/web/src/config/nav.ts`, `apps/web/src/middleware.ts`, `apps/web/src/features/profile/components/ProfileTabs.tsx` |
| Broken links / route mismatches | Mostly fixed | High | Explore cards/share links use slug semantics. Remaining gate is preventing any mock detail fallback for failed backend fetches. | `apps/web/src/features/explore/components/ExploreLayout.tsx`, `apps/web/src/app/explore/sites/[slug]/page.tsx` |
| shadcn/ui usage vs native elements | Implemented but needs fixes | Medium | The app mostly uses shared UI primitives, but there are still large page-level components with direct form/layout logic. | `apps/web/src/components/ui/*`, `apps/web/src/app/groups/page.tsx`, `apps/web/src/app/events/page.tsx` |
| Tailwind v4 token consistency | Implemented but needs fixes | Low | The app appears token-driven, but page code still leans heavily on bespoke utility strings and visual one-offs. | `apps/web/src/app/globals.css`, `apps/web/src/app/groups/page.tsx`, `apps/web/src/app/events/page.tsx` |
| Feature-based file structure compliance | Implemented but needs fixes | High | There is feature organization, but duplication exists (`profile` and `profiles`), and some app routes still carry heavy business logic directly. | `apps/web/src/features/profile`, `apps/web/src/features/profiles`, `apps/web/src/app/groups/page.tsx`, `apps/web/src/app/events/page.tsx` |
| Legacy or wrong imports | Implemented but needs fixes | High | Old README guidance is stale. Competitive Records still points at legacy endpoints, but it is deferred and hidden from launch. | `apps/web/src/features/README.md`, `apps/web/src/features/competitiveRecords/api/competitiveRecords.ts`, `apps/web/src/middleware.ts` |
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
| Failure cases that block public launch | Needs final pass | High | Remaining gates are real-data-or-404 Explore detail behavior, final verification from a clean install/toolchain, and deploy-time smoke for auth/media/messaging/community flows. Competitive Records is deferred/hidden rather than a launch feature. | see blockers below |

## Go-Live Blockers

1. Explore detail must be real data or 404.
   - The main `/explore` experience uses `fphgo`, but `/explore/sites/[slug]` must not render seeded/mock detail content after backend failure.
   - Evidence: `apps/web/src/app/explore/sites/[slug]/page.tsx`, `apps/web/test/explore-detail-truth-contract.test.mjs`

2. Final verification needs a clean rerun.
   - Prior targeted checks exist in the execution log, but go-live needs current checkout verification from a working local install and Go toolchain.
   - Evidence: `docs/go-live/fph-execution-log.md`, `package.json`, `services/fphgo/Makefile`

3. Competitive Records must remain deferred.
   - It is not implemented in the canonical backend and still points at legacy `/competitive-records` endpoints, but it is hidden/redirected and therefore not a launch blocker while kept out of scope.
   - Evidence: `apps/web/src/features/competitiveRecords/api/competitiveRecords.ts`, `apps/web/src/middleware.ts`, absence of `services/fphgo/internal/features/competitive_records`

4. Deploy-time media/auth smoke is still required.
   - Production startup now enforces media config, but code-wise readiness is not the same as proving avatar/media upload and readback in the target environment.
   - Evidence: `services/fphgo/internal/config/config.go`, `services/fphgo/internal/features/media/service/service.go`, `docs/go-live/fph-launch-smoke-checklist.md`

## Non-Blocking Debt

- Dead sample file under events: `apps/web/src/app/events/data.ts`
- Stale feature architecture README: `apps/web/src/features/README.md`
- Duplicate or compatibility routes that should eventually be collapsed:
  - `apps/web/src/app/profile/page.tsx`
  - `apps/web/src/app/profile/[username]/page.tsx`
  - `services/fphgo/internal/app/routes.go` legacy `/profiles/{username}`
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
