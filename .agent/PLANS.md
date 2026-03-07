# ExecPlan Policy

## Purpose

An ExecPlan is a living implementation plan for complex work. It must stay current as facts, risks, and decisions evolve.

## When ExecPlan Is Mandatory

Create an ExecPlan before coding when any of the following are true:

- Changes span multiple workspaces (`apps/*` + `packages/*`), or multiple apps.
- Shared contracts or utilities change (`packages/types`, `packages/utils`, `packages/config`, `packages/db`, `packages/ui`).
- DB schema/migration behavior changes.
- Auth/security, middleware, request validation, or infra/runtime behavior changes.
- The change is large enough to require staged milestones and checkpoints.

## Constraints

- Do not touch `apps/api`; it is legacy. All API work belongs in `services/fphgo`.

## Required Standard

- Plans must be self-contained: a contributor can execute from the plan without hidden context.
- Plans must be evidence-driven: all repo claims should reference checked files/scripts/paths.
- Unknowns must be called out explicitly; do not guess.
- Validation is required for every completed milestone.
- For risky actions, include rollback notes before execution.

## Canonical Lifecycle

1. **Spec + acceptance lock** — Capture exact scope, non-goals, constraints, and acceptance criteria.
2. **Repo-aware discovery** — Inspect actual workspace scripts, source structure, and config files; record concrete evidence paths.
3. **Milestone implementation** — Execute in small, reversible milestones; keep each milestone scoped to one intent.
4. **Evidence-driven verification** — Run the narrowest valid checks first, then broaden as risk grows.
5. **Post-pass review** — Validate regressions, boundary impacts, and docs/config consistency.
6. **Follow-through** — Update plan status, changed-file list, and residual risks.

## ExecPlan Section Order

1. Title  
2. Objective  
3. Scope  
4. Constraints And Non-Goals  
5. Acceptance Criteria  
6. Repo Evidence  
7. Risks And Rollback  
8. Milestones  
9. Verification Plan  
10. Progress Log  
11. Outcomes And Follow-Ups  

## Milestone Template

```
### Milestone <N>: <Name>
- Goal:
- Inputs/Dependencies:
- Changes:
- Validation Commands:
- Expected Evidence:
- Rollback Notes:
- Status: `pending | in_progress | done`
```

## Verification Playbooks

### Workspace-Targeted (Preferred First)

- API: `pnpm --filter @freediving.ph/api type-check` | `lint` | `test`
- Web: `pnpm --filter @freediving.ph/web type-check` | `lint` | `test`
- Shared packages: `pnpm --filter @freediving.ph/types test` (and similar for utils, config, ui, db)

### Cross-Workspace Or Release-Level

- `pnpm typecheck` | `pnpm lint` | `pnpm test` | `pnpm build` | `pnpm preflight`

### Go Service

- `cd services/fphgo && make sqlc`
- `cd services/fphgo && go test ./...`

## Formatting Rules

- In chat: output ExecPlan as one fenced `md` block.
- In file form: append new plans below this policy; do not wrap with an outer code fence.

---

# ExecPlan: Dive Site Submission Map-Pin Contract

## 1. Title

Dive site submission map-pin UX and server-side area derivation

## 2. Objective

Replace manual area and coordinate entry with a map-pin flow in `apps/web`, and enforce a server-derived coarse area in `services/fphgo` so the API no longer trusts client-provided area strings.

## 3. Scope

- `apps/web` dive site submission form and map picker dialog.
- `packages/types` explore submission request contract.
- `services/fphgo` explore submission DTO/service behavior and reverse geocoding client.
- Targeted tests for the new request validation and web submission flow wiring.

## 4. Constraints And Non-Goals

- Do not touch `apps/api/*`.
- Keep `services/fphgo` handlers thin and continue using `httpx.DecodeAndValidate[T]`.
- Do not change the DB schema for `dive_sites.area`; only change how it is derived.
- Non-goal: exact-address capture or storage.
- Non-goal: Redis/external cache infrastructure for geocoding in v1.

## 5. Acceptance Criteria

- Submission UI removes manual `area`, `latitude`, and `longitude` inputs.
- Users must choose a location via a map picker before submit.
- Submission requests send only `lat` and `lng` for location.
- `services/fphgo` reverse geocodes `lat`/`lng` into coarse `{cityOrMunicipality}, {province}` before persistence.
- Reverse-geocode failure returns a `400 validation_error` with issue path `["location"]`, code `invalid_location`, and the requested message.
- Tests cover request validation, geocode-to-area persistence flow, geocode failure behavior, and web payload/UI wiring.

## 6. Repo Evidence

- Current submit page still exposes manual location fields: `apps/web/src/app/explore/submit/page.tsx`
- Current form schema still validates manual area/coordinate entry: `apps/web/src/features/diveSpots/schemas/siteSubmission.schema.ts`
- Shared explore submission contract currently includes client `area`: `packages/types/src/index.ts`
- Go explore submission DTO currently accepts client `area`: `services/fphgo/internal/features/explore/http/dto.go`
- Go explore handler already uses `httpx.DecodeAndValidate[T]`: `services/fphgo/internal/features/explore/http/handlers.go`
- Go explore service currently trusts client-provided area when creating submissions: `services/fphgo/internal/features/explore/service/service.go`
- Existing Google Maps provider in web: `apps/web/src/providers/map-provider.tsx`

## 7. Risks And Rollback

- Risk: introducing reverse geocoding without injection points creates brittle tests and runtime failure coupling.
- Risk: map-picker UI can become untestable if it hard-depends on live Google Maps state.
- Risk: dirty local worktree means broad rewrites could trample unrelated edits.
- Rollback Notes:
  - Revert the new reverse geocoder wiring and restore the prior request contract if runtime issues surface.
  - Revert the submit-page component split if the dialog integration causes regressions.

## 8. Milestones

### Milestone 1: Contract and service foundation
- Goal: update shared types, Go DTOs, and service behavior to require `lat`/`lng` and derive area server-side.
- Inputs/Dependencies:
  - `packages/types/src/index.ts`
  - `services/fphgo/internal/features/explore/http/dto.go`
  - `services/fphgo/internal/features/explore/service/service.go`
  - `services/fphgo/internal/config/config.go`
- Changes:
  - remove request `area`
  - add reverse geocoder interface/client
  - derive coarse area before repo create
- Validation Commands:
  - `go test ./internal/features/explore/...`
  - `pnpm --filter @freediving.ph/types test`
- Expected Evidence:
  - submission service rejects missing/invalid coordinates
  - derived area passed into repo create path
- Rollback Notes:
  - revert contract and service changes before web wiring if geocoding behavior is unstable
- Status: `done`

### Milestone 2: Web submission UX
- Goal: replace manual location entry with a map-pin dialog and derived area display.
- Inputs/Dependencies:
  - `apps/web/src/app/explore/submit/page.tsx`
  - `apps/web/src/providers/map-provider.tsx`
  - `apps/web/src/components/ui/dialog.tsx`
- Changes:
  - add map picker dialog
  - store nested `location` form value
  - disable submission until a pin is selected
  - submit only `lat` and `lng`
- Validation Commands:
  - `pnpm --filter @freediving.ph/web test`
  - `pnpm --filter @freediving.ph/web type-check`
- Expected Evidence:
  - form source no longer contains manual area/coordinate inputs
  - payload wiring excludes area
- Rollback Notes:
  - revert submit-page changes while keeping backend contract isolated if web UX fails review
- Status: `done`

### Milestone 3: Verification and cleanup
- Goal: add targeted tests and verify no contract drift.
- Inputs/Dependencies:
  - updated web and Go code from milestones 1-2
- Changes:
  - add Go tests for validation/geocode behavior
  - add web contract tests for dialog/payload wiring
  - run narrow checks and record outcomes
- Validation Commands:
  - `go test ./internal/features/explore/...`
  - `pnpm --filter @freediving.ph/types test`
  - `pnpm --filter @freediving.ph/web test`
  - `pnpm --filter @freediving.ph/web type-check`
- Expected Evidence:
  - all targeted checks pass or known blockers are documented
- Rollback Notes:
  - revert only failing milestone-specific files; avoid touching unrelated dirty-worktree changes
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && go test ./internal/features/explore/...`
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web type-check`

## 10. Progress Log

- 2026-03-01: Audited existing explore submission flow in web, shared types, and `services/fphgo`; confirmed the current implementation still trusts client-provided area and exposes manual area/coordinate inputs.
- 2026-03-01: Updated the shared submission contract to require `lat` and `lng`, added a server-side Google reverse geocoder client, and derived coarse area in the explore service before persistence.
- 2026-03-01: Replaced manual location inputs in the web submit form with a full-screen map-pin dialog, read-only pinned-area summary, and submit gating until a pin is selected.
- 2026-03-01: Added Go tests for coordinate validation and geocode failure/storage behavior, plus a web contract test for the map-pin submission flow. Verified `pnpm --filter @freediving.ph/types test`, `pnpm --filter @freediving.ph/web type-check`, targeted web contract test, and `go test ./internal/features/explore/...`.
- 2026-03-01: Full `pnpm --filter @freediving.ph/web test` still fails on pre-existing unrelated contract/smoke tests (`best-addon-mvp1-contract`, `explore-buddy-site-contract`, `phase6-frontend-hardening-contract`, and `fphgo-ci-smoke` env dependency).

## 11. Outcomes And Follow-Ups

# ExecPlan: Messaging Transactions Tab And Category Foundation

## 1. Title

Messaging `Transactions` tab rollout with backend category support

## 2. Objective

Replace `general` tab usage with `transactions` in the messaging v1 flow, add backend category support, and provide an explicit API to move thread inbox category between `primary` and `transactions` for service-flow integration.

## 3. Scope

- `services/fphgo` DB schema + migration + messaging service/http/repo category handling.
- `packages/types` messaging category contract update.
- `apps/web` messaging tab labels/categories, API calls, and badge counts.

## 4. Constraints And Non-Goals

- Do not modify `apps/api`.
- Non-goal: full service-transaction domain implementation (no existing `fphgo` service-booking backend yet).
- Keep backward safety where possible for existing data.

## 5. Acceptance Criteria

- Web shows `Primary`, `Transactions`, `Requests`; `General` removed from tab UI.
- `/v1/messages/threads?category=transactions` works.
- Existing `general` member categories are migrated to `transactions`.
- API includes explicit thread category update endpoint for `primary|transactions`.
- Targeted web/go checks pass.

## 6. Repo Evidence

- Messaging categories currently include `general`: `packages/types/src/index.ts`, `apps/web/src/features/messages/components/MessagingView.tsx`, `services/fphgo/internal/features/messaging/repo/repo.go`.
- DB enum currently has `('primary', 'general', 'requests')`: `services/fphgo/db/schema/000_schema.sql`, `services/fphgo/db/migrations/0021_messaging_threads_v1.sql`.
- Thread listing already filters by per-member `inbox_category`: `services/fphgo/internal/features/messaging/repo/queries/messaging.sql`.

## 7. Risks And Rollback

- Risk: category enum migration mismatch could break sqlc/query compilation.
- Risk: strict category validation can break old clients sending `general`.
- Rollback: revert migration + service/category validation changes + web type/tab changes together.

## 8. Milestones

### Milestone 1: Backend category foundation
- Goal: add `transactions` category in DB/schema/repo/service/http.
- Status: `done`

### Milestone 2: Web + shared contract rollout
- Goal: switch types and UI from `general` to `transactions`.
- Status: `done`

### Milestone 3: Verification
- Goal: run targeted checks and ensure no route/message regressions.
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && make sqlc`
- `cd services/fphgo && go test ./internal/features/messaging/...`
- `pnpm --filter @freediving.ph/web type-check`

## 10. Progress Log

- 2026-03-06: Planned implementation and validated current category usage and enum definitions across DB, backend, and web.
- 2026-03-06: Added DB migration `0022_messaging_transactions_category.sql` to introduce `transactions` inbox category and migrate existing `general` memberships.
- 2026-03-06: Updated messaging backend category handling (`ListThreads`, repo category mapping), added `POST /v1/messages/threads/{threadId}/category`, and broadcasted `thread.updated` on category change.
- 2026-03-06: Switched shared/web messaging category contracts and tabs from `general` to `transactions`; kept `general` as a backend alias for backward compatibility.
- 2026-03-06: Verified with `make sqlc`, `go test ./internal/features/messaging/...`, `pnpm --filter @freediving.ph/web type-check`, and `pnpm --filter @freediving.ph/types test`.

## 11. Outcomes And Follow-Ups

- Follow-up: service checkout/booking flow should call the new category endpoint (or a dedicated server-side workflow endpoint) to tag/open transaction-linked threads automatically.

- Implemented as planned. Follow-up only if you want broader browser-level interaction coverage with a dedicated component-test harness or Playwright auth fixture.

# ExecPlan: Messaging Threads E2E (Go + Web)

## 1. Title

Messaging threads v1 end-to-end across `services/fphgo` and `apps/web`

## 2. Objective

Replace the current request/conversation-centric messaging flow with a thread-centric v1 that supports category tabs (`primary`, `general`, `requests`), server-backed search, pagination, read state, and websocket realtime events, with responsive desktop/mobile UI at `/messages` and `/messages/[threadId]`.

## 3. Scope

- Add new messaging schema objects and indexes for thread/member/message modeling.
- Add sqlc query set and regenerate feature sqlc artifacts.
- Implement `services/fphgo` messaging repo/service/http endpoints for `/v1/messages/threads*` and mark-read.
- Extend websocket hub for targeted user fanout and wire messaging events (`message.created`, `thread.updated`, `thread.read`).
- Replace `apps/web` messaging client/hooks/components/pages with split desktop + mobile route-based UX.
- Update shared TS contracts in `packages/types` and route helpers in `apps/web/src/lib/api/fphgo-routes.ts`.
- Add implementation notes doc for schema/endpoints/events/deferred items.

## 4. Constraints And Non-Goals

- Do not touch `apps/api`.
- Keep handlers thin; business logic in services; repo DB-only.
- Use existing auth and validation (`httpx.DecodeAndValidate[T]`).
- No Redis/pubsub fanout; single-instance in-memory websocket hub only.
- Non-goal: group messaging, media/voice send, typing/reactions/replies/edit/delete, E2EE, push notifications.

## 5. Acceptance Criteria

- New migration is reversible and introduces thread/member/message structures required for v1.
- `GET /v1/messages/threads`, `GET /v1/messages/threads/{threadId}`, `GET /v1/messages/threads/{threadId}/messages`, `POST /v1/messages/threads/{threadId}/messages`, `POST /v1/messages/threads/direct`, and `POST /v1/messages/threads/{threadId}/read` are implemented and protected.
- Direct thread open/create reuses existing active pair thread.
- Conversation list/search/category filters are server-backed and paginated.
- Message send and read updates emit websocket events to thread-member users only.
- Web routes `/messages` and `/messages/[threadId]` implement responsive inbox/thread behavior and optimistic send reconciliation.
- No `dark:` classes are used in the new messaging UI.

## 6. Repo Evidence

- Existing messaging backend is request/conversation based: `services/fphgo/internal/features/messaging/{http,service,repo}`.
- Existing web messaging page is monolithic and not responsive split-pane: `apps/web/src/app/messages/page.tsx`.
- Existing WS hub broadcasts globally to all clients: `services/fphgo/internal/realtime/ws/hub.go`.
- Existing schema defines `conversations`, `conversation_participants`, `messages`: `services/fphgo/db/schema/000_schema.sql`.

## 7. Risks And Rollback

- Risk: breaking existing message tests/routes while introducing new thread routes.
- Risk: sqlc generation mismatch if query names/types are inconsistent.
- Risk: websocket change can unintentionally leak events to non-members.
- Rollback Notes:
  - Keep old routes untouched while adding thread routes in parallel.
  - Isolate new DB objects to `message_*` prefixed tables to avoid destructive schema churn.
  - Revert milestone-specific files only if a stage fails verification.

## 8. Milestones

### Milestone 1: Schema + query layer
- Goal: add message thread schema and sqlc query surface.
- Inputs/Dependencies:
  - `services/fphgo/db/migrations`
  - `services/fphgo/internal/features/messaging/repo/queries/messaging.sql`
  - `services/fphgo/sqlc.yaml`
- Changes:
  - add migration for `message_threads`, `message_thread_members`, `thread_messages` (+ enums/indexes)
  - add query set for list/search/detail/messages/send/read/direct-thread upsert
  - regenerate sqlc files
- Validation Commands:
  - `cd services/fphgo && make sqlc`
  - `cd services/fphgo && go test ./internal/features/messaging/repo/...`
- Expected Evidence:
  - generated sqlc code compiles with new repo interfaces
- Rollback Notes:
  - revert migration/query additions before service wiring if query surface is unstable
- Status: `done`

### Milestone 2: Go service/http/ws integration
- Goal: implement required `/threads` endpoints and targeted realtime delivery.
- Inputs/Dependencies:
  - milestone 1 query surface
  - `services/fphgo/internal/features/messaging/{repo,service,http}`
  - `services/fphgo/internal/realtime/ws`
- Changes:
  - add new DTOs and handler methods
  - enforce membership/authz and non-regressive read logic
  - add direct-thread open/create service path
  - add hub per-user fanout + messaging event payloads
- Validation Commands:
  - `cd services/fphgo && go test ./internal/features/messaging/... ./internal/realtime/ws ./internal/app`
- Expected Evidence:
  - thread endpoints available and tests covering core flows
- Rollback Notes:
  - preserve old endpoints; rollback only new handlers/service methods if needed
- Status: `done`

### Milestone 3: Web feature rewrite + responsive routing
- Goal: replace web messaging feature with URL-driven inbox/thread UX and realtime reconciliation.
- Inputs/Dependencies:
  - new API contracts/routes
  - `apps/web/src/features/messages`
  - `apps/web/src/app/messages/page.tsx` and new `[threadId]/page.tsx`
- Changes:
  - update messages API client and query keys for category/search/pagination
  - implement desktop split pane and mobile list/thread states
  - optimistic send with `clientId` reconciliation
  - mark-read on visible active thread
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
  - `pnpm --filter @freediving.ph/web test`
- Expected Evidence:
  - routes render correctly with themed token classes and no `dark:` utilities
- Rollback Notes:
  - revert web-only messaging files if backend contract still in flux
- Status: `done`

### Milestone 4: Contracts/docs verification
- Goal: align shared TS contracts and add implementation notes.
- Inputs/Dependencies:
  - backend + web changes from prior milestones
  - `packages/types`
- Changes:
  - update/add messaging contracts and tests
  - add short implementation notes doc in `services/fphgo/docs`
- Validation Commands:
  - `pnpm --filter @freediving.ph/types test`
  - targeted combined checks from milestones 2-3
- Expected Evidence:
  - documented schema/endpoints/events/deferred items and passing contract tests
- Rollback Notes:
  - keep docs/contracts aligned with shipped behavior; revert incomplete drift
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && make sqlc`
- `cd services/fphgo && go test ./internal/features/messaging/... ./internal/realtime/ws ./internal/app`
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`

## 10. Progress Log

- 2026-03-06: Audited current messaging backend/web/ws and confirmed model/route mismatch against requested thread-based v1.
- 2026-03-06: Added migration `0021_messaging_threads_v1.sql`, updated schema snapshot, appended thread-based sqlc queries, regenerated sqlc, and implemented additive repo/service/http `/v1/messages/threads*` flows with targeted websocket fanout.
- 2026-03-06: Replaced web messaging page with route-driven responsive inbox/thread UI (`/messages`, `/messages/[threadId]`), server-backed tab/search/pagination queries, optimistic send via `clientId`, and read-mark behavior.
- 2026-03-06: Updated route snapshot for internal app routes, ran messaging/app Go tests and web/type package checks; did not run full `@freediving.ph/web` test suite in this pass.

## 11. Outcomes And Follow-Ups

- Pending implementation.

# ExecPlan: Chika Pseudonym Trust Hardening

## 1. Title

Chika long-term anonymity hardening (aliases, reveal gating, and moderation-safe response behavior)

## 2. Objective

Implement durable per-thread pseudonymous identity, reduce collision risk, enforce account-level pseudonymous controls, and prevent identity leakage from default list/detail endpoints while preserving moderator workflows.

## 3. Scope

- `services/fphgo` DB migration + schema snapshot updates for alias storage and mode constraints.
- `services/fphgo` config, authz, chika repo/service/http behavior.
- `apps/web` chika detail UX notice for automatic anonymous replies.
- chika/config/authz targeted tests.

## 4. Constraints And Non-Goals

- Do not modify legacy `apps/api`.
- Keep existing endpoint paths; avoid introducing breaking route changes in this pass.
- Non-goal: build a full standalone reveal-audit endpoint family in this pass.

## 5. Acceptance Criteria

- Thread/user alias mapping is persisted and reused (`chika_thread_aliases`).
- New pseudonyms use HMAC+secret-derived format and are collision-hardened via DB uniqueness.
- Pseudonymous posting is blocked for users with `profiles.pseudonymous_enabled = false`.
- Default thread/comment responses omit real author IDs; reveal requires explicit request + permission.
- Reveal attempts are rate-limited.
- Pseudonymous threads have stricter write/reaction limits than normal threads.
- Web thread detail explicitly states comments/replies are automatically pseudonymous.

## 6. Repo Evidence

- Existing pseudonym hash in service used SHA1 with short output: `services/fphgo/internal/features/chika/service/service.go`
- Existing real IDs exposed automatically for moderators in thread/comment responses: `services/fphgo/internal/features/chika/http/handlers.go`
- Existing schema lacked alias mapping table and allowed only `normal|pseudonymous` modes: `services/fphgo/db/schema/000_schema.sql`
- Existing web comment UI had no explicit per-thread anonymity reminder: `apps/web/src/app/chika/[id]/page.tsx`

## 7. Risks And Rollback

- Risk: response contract behavior change for moderators relying on `realAuthorUserId` in default payloads.
- Risk: rollout without `CHIKA_PSEUDONYM_SECRET` in production config blocks startup.
- Rollback Notes:
  - revert migration `0025_chika_aliases_and_mode_hardening.sql` and restore prior pseudonym generation logic if rollout blocks.
  - revert reveal gating changes in handlers if moderator UI integrations require immediate fallback.

## 8. Milestones

### Milestone 1: Data and config foundations
- Goal: add alias persistence table + mode hardening and runtime secret support.
- Inputs/Dependencies:
  - `services/fphgo/db/migrations`
  - `services/fphgo/db/schema/000_schema.sql`
  - `services/fphgo/internal/config/config.go`
- Changes:
  - add `chika_thread_aliases` table + uniqueness/index + backfill from existing rows
  - extend thread mode check to include `locked_pseudonymous`
  - add `CHIKA_PSEUDONYM_SECRET` config support/validation
- Validation Commands:
  - `cd services/fphgo && go test ./internal/config`
- Expected Evidence:
  - config tests include production guard for missing pseudonym secret
- Rollback Notes:
  - revert migration and config fields together to avoid mixed runtime/state
- Status: `done`

### Milestone 2: Repo + service pseudonym model
- Goal: move pseudonym generation to persisted alias model and enforce user setting.
- Inputs/Dependencies:
  - `services/fphgo/internal/features/chika/{repo,service}`
- Changes:
  - add repo alias methods (`GetThreadAlias`, `FindHistoricalThreadPseudonym`, `UpsertThreadAlias`)
  - generate pseudonyms using HMAC secret
  - resolve/store aliases per thread/user and hydrate pseudonymous thread author aliases
  - enforce `pseudonymous_enabled` for pseudonymous posting
  - tighten pseudonymous-thread write/reaction limits
- Validation Commands:
  - `cd services/fphgo && go test ./internal/features/chika/repo ./internal/features/chika/service`
- Expected Evidence:
  - service and repo tests pass with new interface methods and alias flow
- Rollback Notes:
  - revert service/repo changes together to keep interface surface consistent
- Status: `done`

### Milestone 3: HTTP leak prevention + UX signal
- Goal: stop default identity leakage while preserving controlled moderator reveal.
- Inputs/Dependencies:
  - `services/fphgo/internal/features/chika/http`
  - `services/fphgo/internal/shared/authz/authz.go`
  - `apps/web/src/app/chika/[id]/page.tsx`
- Changes:
  - add `chika.reveal_identity` permission in Go authz
  - only include `realAuthorUserId` when `includeRealAuthor=true` and actor has reveal permission
  - add per-request reveal rate-limit enforcement
  - add thread-level UI notice that comments/replies are auto-anonymous in anonymous threads
- Validation Commands:
  - `cd services/fphgo && go test ./internal/features/chika/http ./internal/shared/authz`
  - `pnpm --filter @freediving.ph/web type-check`
- Expected Evidence:
  - moderator IDs no longer appear by default in thread/comment payloads
- Rollback Notes:
  - revert handler gating + authz permission if moderation tooling depends on legacy default payloads
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && go test ./internal/features/chika/... ./internal/config ./internal/shared/authz`
- `pnpm --filter @freediving.ph/web type-check`

## 10. Progress Log

- 2026-03-07: Added migration `0025_chika_aliases_and_mode_hardening.sql` and schema snapshot updates for alias mapping + mode constraints.
- 2026-03-07: Added `CHIKA_PSEUDONYM_SECRET` config wiring and production guard; wired secret into chika service dependency construction.
- 2026-03-07: Replaced ad hoc short SHA1 pseudonyming with HMAC-based alias generation + persisted thread alias flow, added pseudonymous account-setting enforcement, and tightened pseudonymous-thread rate limits.
- 2026-03-07: Updated chika handlers to gate `realAuthorUserId` behind `includeRealAuthor=true` + `chika.reveal_identity` + reveal rate limit; updated related chika HTTP tests.
- 2026-03-07: Added anonymous-thread comment UX notice in web and updated pseudonym/rate-limit docs.

## 11. Outcomes And Follow-Ups

- Targeted backend tests pass: chika repo/service/http, config, authz.
- Web type-check passes.
- Known residual: `go test ./internal/app` route-snapshot assertion reports pre-existing route-count drift in local branch; not updated in this pass.

# ExecPlan: App-Wide Notifications V1 In FPHGO

## 1. Title

App-wide notifications foundation for `/notifications` using `services/fphgo`

## 2. Objective

Implement a canonical notifications backend in `services/fphgo` (schema, service, and HTTP routes), wire permissions/auth, and align `apps/web` notifications API calls to that backend.

## 3. Scope

- `services/fphgo` notifications feature (repo, service, http, routing, dependency wiring).
- `services/fphgo` DB migration + schema snapshot updates for notifications tables.
- `services/fphgo` authz permission additions for notification read/write.
- `apps/web` notifications API client path/contract alignment to `fphgo` v1 routes.

## 4. Constraints And Non-Goals

- Do not modify legacy `apps/api` for this implementation.
- Keep handlers thin; policy in service; DB access in repo.
- Non-goal: full async delivery pipeline (email/push workers) in this pass.
- Non-goal: websocket live notification fanout in this pass.

## 5. Acceptance Criteria

- `fphgo` exposes member-protected notification endpoints under `/v1/notifications` for:
  - list user notifications
  - read notification by id
  - mark one read
  - mark all read
  - delete notification
  - unread count
  - get/update settings
  - create notification (write-permission route)
- Authorization prevents users from reading/mutating other users' notifications.
- Notification list supports server-side filter inputs (`status`, `type`, `priority`) and pagination controls.
- Web `/notifications` page loads from `/v1/notifications` endpoints (not legacy `/notifications/*`).
- Targeted Go + web checks pass, or failures are explicitly documented.

## 6. Repo Evidence

- Current web notifications page and hooks exist: `apps/web/src/app/notifications/page.tsx`, `apps/web/src/features/notifications/*`.
- Current web notifications client points to legacy-style `/notifications/*`: `apps/web/src/features/notifications/api/notifications.ts`.
- `fphgo` currently has no notifications feature mounted in router: `services/fphgo/internal/app/routes.go`, `services/fphgo/internal/app/app.go`.
- Permission/middleware pattern to follow: `services/fphgo/internal/shared/authz/authz.go`, `services/fphgo/internal/middleware/clerk_auth.go`.
- Feature layering examples: `services/fphgo/internal/features/buddies/*`.

## 7. Risks And Rollback

- Risk: contract mismatch with existing frontend `ApiEnvelope` assumption.
- Risk: identity uses UUID in `fphgo`, while web types currently model numeric IDs for notifications.
- Risk: route surface changes may require snapshot/contract test updates.
- Rollback Notes:
  - revert notifications route mount + feature wiring if contract fallout is broad.
  - keep migration reversible and isolated so it can be rolled back independently.

## 8. Milestones

### Milestone 1: Backend notification domain in fphgo
- Goal: add notifications tables/migration and core repo/service/http endpoints.
- Inputs/Dependencies:
  - `services/fphgo/db/schema/000_schema.sql`
  - `services/fphgo/db/migrations/*`
  - `services/fphgo/internal/features/*`
- Changes:
  - add `notifications` and `notification_settings` tables + indexes
  - implement notifications repo/service/http and route mounting
  - enforce actor ownership in service for read/write ops
- Validation Commands:
  - `cd services/fphgo && go test ./internal/features/notifications/...`
- Expected Evidence:
  - notification handlers compile and return stable JSON responses
- Rollback Notes:
  - revert new feature folder and route mount together to avoid dangling dependencies
- Status: `done`

### Milestone 2: Authz and app wiring
- Goal: add explicit notification permissions and enforce via middleware.
- Inputs/Dependencies:
  - `services/fphgo/internal/shared/authz/authz.go`
  - `services/fphgo/internal/app/{app.go,routes.go}`
- Changes:
  - add `notifications.read` and `notifications.write`
  - include permissions in role grants
  - mount `/v1/notifications` under member + permission groups
- Validation Commands:
  - `cd services/fphgo && go test ./internal/shared/authz ./internal/app`
- Expected Evidence:
  - authz tests include new permission behavior
  - route tests include notifications paths and protection
- Rollback Notes:
  - revert authz additions together with route wiring if policy gating breaks clients
- Status: `done`

### Milestone 3: Web client contract alignment
- Goal: point web notifications client to `fphgo` route contract and stop client-side anti-patterns.
- Inputs/Dependencies:
  - `apps/web/src/features/notifications/api/notifications.ts`
- Changes:
  - switch API paths to `/v1/notifications/*`
  - use server-side filtering query params for list
  - fetch stats from dedicated endpoint instead of deriving from full list
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
  - targeted notifications tests if present
- Expected Evidence:
  - `/notifications` page reads and mutates via `fphgo` endpoints only
- Rollback Notes:
  - revert only notifications API client file if frontend contract mismatch is found
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && go test ./internal/features/notifications/...`
- `cd services/fphgo && go test ./internal/shared/authz ./internal/app`
- `pnpm --filter @freediving.ph/web type-check`
- Optional broader check if targeted checks pass: `cd services/fphgo && go test ./...`

## 10. Progress Log

- 2026-03-07: Audited current web notifications implementation and confirmed it targets legacy-style endpoints and computes stats client-side.
- 2026-03-07: Confirmed no existing notifications feature in `services/fphgo`; implementation required from schema to routes.
- 2026-03-07: Added migration `0026_notifications_v1.sql` and schema snapshot updates for `notifications` + `notification_settings` tables and indexes.
- 2026-03-07: Implemented `services/fphgo/internal/features/notifications` (`repo`, `service`, `http`) with identity-scoped list/read/mark-read/mark-all/delete/settings/stats/unread-count endpoints.
- 2026-03-07: Added notification permissions in authz and mounted `/v1/notifications` in app router + dependency wiring.
- 2026-03-07: Updated web notifications client/hooks/components/page to call `/v1/notifications` and removed numeric-user-id gating from `/notifications`.
- 2026-03-07: Verified targeted checks: `go test ./internal/features/notifications/... ./internal/shared/authz ./internal/app`, `pnpm --filter @freediving.ph/web type-check`, and `pnpm --filter @freediving.ph/types test`.

## 11. Outcomes And Follow-Ups

- Implemented app-wide notifications foundation for `/notifications` on `fphgo` with identity-scoped routes and frontend alignment.
- Snapshot update executed for intentional route surface change (`UPDATE_SNAPSHOTS=1 go test ./internal/app -run TestRouteSurfaceSnapshot`).
- Non-goal remains open: async fanout workers (email/push) and websocket notification fanout.

# ExecPlan: Community Groups Domain With Group-Linked Events

## 1. Title

Community Groups v1/v2 in `services/fphgo` with first-class Group-Event linking

## 2. Objective

Ship a production-ready Groups domain (discovery, membership, moderation-safe posting, and media cover support) on `services/fphgo`, then extend Events so an event can optionally belong to a group with enforceable membership and organizer rules.

## 3. Scope

- `services/fphgo`: schema migrations, sqlc queries, repo/service/http, route mounts, authz integration, and integration tests.
- `packages/types`: canonical Group and Event DTO/contracts aligned with `fphgo`.
- `apps/web`: `/groups` and `/events` API clients/hooks/pages/components to consume `/v1/groups` and `/v1/events` contracts.
- Forward-compatible rollout from current legacy-shaped web contracts (`/groups`, `/events`, numeric IDs) to UUID + `/v1/*`.

## 4. Constraints And Non-Goals

- Do not modify `apps/api`; it is legacy.
- Do not ship dual write between `apps/api` and `services/fphgo`; `fphgo` is canonical for new API work.
- Keep handler layer thin and validated with `httpx.DecodeAndValidate[T]` conventions used in existing `fphgo` features.
- Non-goal for v1: recommendation/ranking engine for groups.
- Non-goal for v1: full event ticketing/payments.
- Non-goal for v1: deep threaded group post comments if core post stream is not yet stable.

## 5. Acceptance Criteria

- `services/fphgo` exposes a mounted `/v1/groups` router with:
  - list/search groups
  - group detail
  - create/update/archive group
  - join/leave/invite/approve membership flow (policy-driven by group type)
  - list members
  - list/create group posts
- `services/fphgo` exposes `/v1/events` router with:
  - list/detail/create/update/cancel events
  - attendee join/leave/list
  - optional `groupId` linkage with authorization checks.
- Group-linked event rules enforced:
  - private/invite group events are only visible/joinable by allowed members.
  - event organizer/staff permissions can derive from group ownership/moderator role where configured.
  - deleting/archiving a group does not orphan event integrity (explicit policy + migration constraints).
- `apps/web/src/app/groups/page.tsx` and events pages work against `/v1/*` endpoints and no longer rely on legacy response shapes.
- Shared types in `packages/types` match Go responses (UUID strings, status/type enums, pagination envelopes).
- Targeted Go + web checks pass for touched modules.

## 6. Repo Evidence

- Groups web page exists but is wired to legacy endpoints and wrong response shape assumptions:
  - `apps/web/src/app/groups/page.tsx`
  - `apps/web/src/features/groups/api/groups.ts`
- Events web feature also targets legacy `/events` paths:
  - `apps/web/src/features/events/api/events.ts`
  - `apps/web/src/app/events/page.tsx`
- Current `fphgo` router has no groups/events feature mounts:
  - `services/fphgo/internal/app/routes.go`
  - `services/fphgo/internal/app/app.go`
- `fphgo` currently only has foundational `groups` and `events` tables from RBAC bootstrap:
  - `services/fphgo/db/schema/000_schema.sql`
  - `services/fphgo/db/migrations/0002_platform_foundation_rbac.sql`
- Authz already defines group/event scoped permissions and scope logic:
  - `services/fphgo/internal/shared/authz/authz.go`
  - `services/fphgo/internal/features/identity/repo/repo.go`
- Feed already reads from minimal `events` + `event_memberships`, so event schema changes impact feed candidate queries:
  - `services/fphgo/internal/features/feed/repo/repo.go`

## 7. Risks And Rollback

- Risk: contract mismatch between web typed models (number IDs) and `fphgo` UUID reality can break pages silently.
- Risk: expanding `groups`/`events` tables may break feed query assumptions if defaults/backfills are missed.
- Risk: authorization leakage on group-linked events (private group event visible to non-members) is a security defect.
- Risk: migration order mistakes can break existing foreign keys or SQLC generation.
- Rollback Notes:
  - Keep migrations additive and reversible; isolate each milestone to one migration where possible.
  - Feature-flag web route adoption to `/v1/groups` and `/v1/events`; allow temporary UI fallback/disable.
  - If group-event linkage introduces critical issues, disable linkage in service policy while keeping base events operational.

## 8. Milestones

### Milestone 1: Canonical domain spec and contract lock
- Goal:
  - Freeze v1 domain rules for groups, memberships, posts, and event-link semantics before implementation.
- Inputs/Dependencies:
  - `packages/types/src/index.ts`
  - `services/fphgo/internal/shared/authz/authz.go`
  - current web pages in `apps/web/src/app/groups` and `apps/web/src/app/events`
- Changes:
  - define canonical enums/statuses and UUID-based DTOs for Group, GroupMember, GroupPost, Event, EventAttendee.
  - define pagination envelope standard and error code matrix.
  - define group-event policy matrix (public/private/invite/closed vs event visibility/join rules).
- Validation Commands:
  - design review checklist captured in plan progress log
- Expected Evidence:
  - one locked API contract section in this plan and updated type definitions in `packages/types`.
- Rollback Notes:
  - do not start DB/API coding until contract lock is accepted.
- Status: `pending`

### Milestone 2: DB schema expansion for groups/events
- Goal:
  - upgrade minimal RBAC tables into usable product tables without data loss.
- Inputs/Dependencies:
  - `services/fphgo/db/migrations`
  - `services/fphgo/db/schema/000_schema.sql`
- Changes:
  - add group fields: `slug`, `description`, `type`, `status`, `visibility`, `location`, counts, `created_by`.
  - add group membership metadata and role/status audit fields.
  - create `group_posts` (and optional `group_post_reactions` if required).
  - expand events fields and add nullable `group_id` FK + supporting indexes.
  - define deletion/archival behavior constraints for group-linked events.
- Validation Commands:
  - `cd services/fphgo && make migrate-up`
  - `cd services/fphgo && go test ./...`
- Expected Evidence:
  - migration applies cleanly on fresh and existing dev DB.
  - schema snapshot reflects new tables/columns/indexes/checks.
- Rollback Notes:
  - rollback by migration step; avoid mixing unrelated schema changes in same migration file.
- Status: `pending`

### Milestone 3: Groups feature in fphgo (repo/service/http/routes)
- Goal:
  - deliver `/v1/groups` backend with membership and posting.
- Inputs/Dependencies:
  - new group schema from Milestone 2
  - existing feature architecture patterns in `services/fphgo/internal/features/*`
- Changes:
  - create `internal/features/groups/{repo,service,http}`.
  - add sqlc queries for list/detail/membership/post flows.
  - enforce scoped permissions using existing authz + identity scope.
  - wire dependencies + mount route in `internal/app/app.go` and `internal/app/routes.go`.
  - add route contract tests and integration tests.
- Validation Commands:
  - `cd services/fphgo && make sqlc`
  - `cd services/fphgo && go test ./internal/features/groups/...`
  - `cd services/fphgo && go test ./internal/app`
- Expected Evidence:
  - `/v1/groups` endpoints appear in route surface tests and pass happy/negative auth cases.
- Rollback Notes:
  - remove mount + dependency wiring if feature needs temporary pullback.
- Status: `pending`

### Milestone 4: Events feature in fphgo with optional group linkage
- Goal:
  - deliver `/v1/events` and enforce group-aware event policies.
- Inputs/Dependencies:
  - schema updates from Milestone 2
  - groups service membership checks from Milestone 3
- Changes:
  - create `internal/features/events/{repo,service,http}`.
  - implement event CRUD + attendee flows.
  - implement group-linked policy checks (visibility, join eligibility, organizer/staff constraints).
  - add optional inherit-mode for moderators/owners to manage group events.
  - mount `/v1/events` routes.
- Validation Commands:
  - `cd services/fphgo && go test ./internal/features/events/...`
  - `cd services/fphgo && go test ./internal/app`
- Expected Evidence:
  - private group event access blocked for non-members.
  - public event behavior remains unchanged when `groupId` is null.
- Rollback Notes:
  - toggle off group-linked constraints by service switch if access bugs appear.
- Status: `pending`

### Milestone 5: Web migration to fphgo contracts (`/groups` + `/events`)
- Goal:
  - make `/groups` and `/events` pages actually functional against `fphgo`.
- Inputs/Dependencies:
  - `apps/web/src/features/groups/*`
  - `apps/web/src/features/events/*`
  - updated `packages/types`
- Changes:
  - repoint API clients to `/v1/groups` and `/v1/events`.
  - fix response shape handling and pagination extraction.
  - remove numeric-user-id assumptions where identity comes from authenticated context.
  - implement missing action wiring (join/leave/create/filter tabs/forms) with proper optimistic updates.
  - update pages/components to strict typing (remove `any`).
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
  - `pnpm --filter @freediving.ph/web test`
- Expected Evidence:
  - `/groups` and `/events` UI can load, join/leave works, and error states are deterministic.
- Rollback Notes:
  - keep API client changes isolated to allow quick revert while retaining backend progress.
- Status: `pending`

### Milestone 6: Group-Event UX integration and admin controls
- Goal:
  - expose explicit event creation from group context and group event feeds.
- Inputs/Dependencies:
  - completed groups + events APIs
  - web routes/components for groups/events
- Changes:
  - add “Create Event in Group” flow with server-side guard.
  - add group detail sections: upcoming events, past events, pinned event.
  - add moderation/admin actions for group events (cancel, transfer organizer, close RSVP).
  - optional notification hooks for group members on event creation/update.
- Validation Commands:
  - `pnpm --filter @freediving.ph/web type-check`
  - targeted web tests for group-event flows
  - `cd services/fphgo && go test ./internal/features/groups/... ./internal/features/events/...`
- Expected Evidence:
  - group pages display linked events with role-aware actions.
- Rollback Notes:
  - disable advanced controls while preserving core link if regressions emerge.
- Status: `pending`

### Milestone 7: Hardening, observability, and launch gates
- Goal:
  - avoid shipping blind.
- Inputs/Dependencies:
  - all previous milestones
- Changes:
  - add structured logs/metrics around group/event write paths.
  - define abuse and moderation controls (rate limits, content/report hooks).
  - performance checks on list endpoints and membership joins.
  - update docs and runbook for incident response + rollback.
- Validation Commands:
  - `cd services/fphgo && go test ./...`
  - `pnpm typecheck && pnpm lint && pnpm test`
- Expected Evidence:
  - launch checklist complete with known limits and rollback tested.
- Rollback Notes:
  - defer GA; keep feature behind navigation/permission gate until SLO targets are met.
- Status: `pending`

## 9. Verification Plan

- Backend incremental:
  - `cd services/fphgo && make sqlc`
  - `cd services/fphgo && go test ./internal/features/groups/...`
  - `cd services/fphgo && go test ./internal/features/events/...`
  - `cd services/fphgo && go test ./internal/app`
- Frontend incremental:
  - `pnpm --filter @freediving.ph/types test`
  - `pnpm --filter @freediving.ph/web type-check`
  - `pnpm --filter @freediving.ph/web test`
- Release-level:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm test`

## 10. Progress Log

- 2026-03-07: Audited `/groups` and `/events` web modules; both target legacy-style endpoints and contracts.
- 2026-03-07: Confirmed no `groups` or `events` feature packages mounted in `services/fphgo/internal/features` and router wiring.
- 2026-03-07: Confirmed foundational schema/authz scope exists (`groups`, `events`, memberships, permission scopes), but product-grade domain implementation is absent.
- 2026-03-07: Drafted this execution plan with explicit group-event linkage milestones and rollback strategy.

## 11. Outcomes And Follow-Ups

- This plan intentionally sequences contract lock before DB/API coding to prevent repeating current contract drift.
- Immediate follow-up: approve or adjust the group-event policy matrix (especially private group event visibility and organizer inheritance) before Milestone 1 is marked done.

# ExecPlan: PSGC Canonical Location Backbone + Form APIs

## 1. Title

PSGC canonical location backbone for `services/fphgo` with form-ready location endpoints

## 2. Objective

Add a stable, versioned PSGC data model in `services/fphgo`, provide an import pipeline from `jobuntux/psgc` snapshots, and expose `/v1/locations` endpoints so event/location forms can bind against canonical region/province/city/barangay codes.

## 3. Scope

- `services/fphgo` DB migration and schema snapshot for PSGC tables + event location canonical fields.
- `services/fphgo` CLI import command for PSGC JSON snapshots.
- `services/fphgo` location feature (`repo/service/http`) and `/v1/locations` route mount.
- Event DTO/repo/service/http updates to accept and return canonical location fields.

## 4. Constraints And Non-Goals

- Do not modify `apps/api`.
- Keep runtime source of truth in local DB, not remote package API calls.
- Non-goal: web UI implementation in this pass.
- Non-goal: geocoding quality/scoring logic in this pass.

## 5. Acceptance Criteria

- Migration creates PSGC tables and event canonical location columns/indexes.
- Import command can load `regions.json`, `provinces.json`, `muncities.json`, `barangays.json` and write import history.
- API exposes `/v1/locations/regions`, `/provinces`, `/cities-municipalities`, `/barangays`.
- Event create/update/read supports canonical location payload fields and codes.
- Targeted Go tests pass for app route/snapshot and DB schema drift consistency.

## 6. Repo Evidence

- Event domain exists with free-text `location`: `services/fphgo/internal/features/events/*`, `services/fphgo/db/migrations/0027_groups_events_v1.sql`.
- No canonical PSGC feature/tables currently exist before this change.
- Router/dependency wiring pattern is centralized in `services/fphgo/internal/app/{app.go,routes.go}`.

## 7. Risks And Rollback

- Risk: FK/code mismatch during import can fail the full transaction.
- Risk: route surface change can break snapshot tests if not updated.
- Rollback:
  - Revert migration `0028_locations_psgc_v1.sql` and event field wiring together.
  - Disable `/v1/locations` mount by reverting `app.go/routes.go` if needed.

## 8. Milestones

### Milestone 1: Schema and migration
- Goal: Add PSGC schema + event canonical location fields/indexes.
- Status: `done`

### Milestone 2: Import pipeline
- Goal: Add deterministic JSON import command + import history writes.
- Status: `done`

### Milestone 3: Form APIs and event integration
- Goal: Add `/v1/locations` endpoints and event payload support for canonical codes.
- Status: `done`

### Milestone 4: Verification
- Goal: Run targeted checks (`go test ./internal/app ./db` and feature compile checks) and update snapshots if needed.
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && go test ./db ./internal/app ./internal/features/events/... ./internal/features/locations/...`
- If route snapshot drifts intentionally:
  - `cd services/fphgo && UPDATE_SNAPSHOTS=1 go test ./internal/app -run TestRouteSurfaceSnapshot`
  - rerun route tests without `UPDATE_SNAPSHOTS`.

## 10. Progress Log

- 2026-03-07: Confirmed `jobuntux/psgc` dataset format under `data/2025-2Q` is JSON files (`regions/provinces/muncities/barangays`).
- 2026-03-07: Added migration `0028_locations_psgc_v1.sql` and schema snapshot updates.
- 2026-03-07: Added `cmd/psgc-import` and `make psgc-import` target.
- 2026-03-07: Added `locations` feature endpoints and mounted `/v1/locations`.
- 2026-03-07: Extended events payload/repo/service to carry canonical location fields.
- 2026-03-07: Ran targeted verification (`go test ./db ./internal/app ./internal/features/events/... ./internal/features/locations/... ./cmd/psgc-import`) and updated route snapshot for `/v1/locations`.
- 2026-03-07: Downloaded PSGC `2025-2Q` source files into `services/fphgo/db/seeds/psgc/2025-2Q`, applied migrations through `0030`, and executed successful import run.

## 11. Outcomes And Follow-Ups

- Follow-up: wire web event/location forms to `/v1/locations` cascades and persist canonical codes + geocoding metadata.
