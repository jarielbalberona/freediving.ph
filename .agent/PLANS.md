# ExecPlan Policy

## Purpose

An ExecPlan is a living implementation plan for complex work. It must stay current as facts, risks, and decisions evolve.

## Required Standard

- Plans must be self-contained: a contributor can execute from the plan without hidden context.
- Plans must be evidence-driven: all repo claims should reference checked files/scripts/paths.
- Unknowns must be called out explicitly; do not guess.

## When ExecPlan Is Mandatory

Create an ExecPlan before coding when any of the following are true:

- Changes span multiple workspaces (`apps/*` + `packages/*`), or multiple apps.
- Shared contracts or utilities change (`packages/types`, `packages/utils`, `packages/config`, `packages/db`, `packages/ui`).
- DB schema/migration behavior changes.
- Auth/security, middleware, request validation, or infra/runtime behavior changes.
- The change is large enough to require staged milestones and checkpoints.

## Canonical Lifecycle

A) Spec + acceptance lock

- Capture exact scope, non-goals, constraints, and acceptance criteria.

B) Repo-aware discovery

- Inspect actual workspace scripts, source structure, and config files relevant to the change.
- Record concrete evidence paths.

C) Milestone implementation

- Execute work in small, reversible milestones.
- Keep each milestone scoped to one intent.

D) Evidence-driven verification

- Run the narrowest valid checks first, then broaden as risk grows.
- Attach command evidence and outcomes.

E) Post-pass review

- Validate regressions, boundary impacts, and docs/config consistency.

F) Mechanical follow-through

- Update plan status, changed-file list, and residual risks.

## Non-Negotiables

- Validation is required for every completed milestone.
- Keep the plan updated with new discoveries and decisions as work progresses.
- Prefer idempotent steps when possible.
- For risky actions, include rollback notes before execution.

## Required ExecPlan Section Order

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

### Milestone <N>: <Name>

- Goal:
- Inputs/Dependencies:
- Changes:
- Validation Commands:
- Expected Evidence:
- Rollback Notes:
- Status: `pending | in_progress | done`

## Verification Playbooks (Use Real Repo Scripts)

### Workspace-Targeted (Preferred First)

- API:
  - `pnpm --filter @freediving.ph/api type-check`
  - `pnpm --filter @freediving.ph/api lint`
  - `pnpm --filter @freediving.ph/api test`
- Web:
  - `pnpm --filter @freediving.ph/web type-check`
  - `pnpm --filter @freediving.ph/web lint`
  - `pnpm --filter @freediving.ph/web test`
- Shared packages:
  - `pnpm --filter @freediving.ph/types test`
  - `pnpm --filter @freediving.ph/utils test`
  - `pnpm --filter @freediving.ph/config test`
  - `pnpm --filter @freediving.ph/ui test`
  - `pnpm --filter @freediving.ph/db test`

### Cross-Workspace Or Release-Level

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm preflight`

## Formatting Rules

- In chat: output ExecPlan as one fenced `md` block.
- In file form: do not wrap with an outer code fence.

---

# ExecPlan: Go Platform Foundation (Auth, Identity, RBAC)

## 1. Title

Implement Phase 1 platform foundation in `services/fphgo`

## 2. Objective

Ship the first migration phase in Go: identity bootstrap, centralized auth context, global-role permission checks, and scope-aware RBAC foundation.

## 3. Scope

- Add DB migration for identity/RBAC baseline.
- Add identity feature module (`repo` + `service`) to resolve local auth context from Clerk subject.
- Add centralized middleware for identity context and permission checks.
- Wire router to use identity context globally for authenticated API group.
- Enforce at least one concrete permission-gated route (`GET /v1/users/{id}`).

## 4. Constraints And Non-Goals

- Non-goal: full groups/events product flows.
- Non-goal: complete moderation/reporting implementation.
- Keep existing endpoint behavior compatible where possible.

## 5. Acceptance Criteria

- Migration adds global role, account status, permission overrides, and membership foundation tables.
- Identity context is attached once per request and reused by guards.
- Permission checks are centralized middleware (not per-handler ad hoc logic).
- Go tests pass.

## 6. Repo Evidence

- Router/middleware composition: `services/fphgo/internal/app/routes.go`
- Existing auth middleware: `services/fphgo/internal/middleware/clerk_auth.go`
- Existing schema/migrations: `services/fphgo/db/schema/000_schema.sql`, `services/fphgo/db/migrations/*`

## 7. Risks And Rollback

- Risk: new auth context breaks routes that previously only required Clerk claims.
- Risk: schema drift checks fail if schema and migration series diverge.
- Rollback: remove `0002_platform_foundation_rbac.sql`, revert middleware and router wiring.

## 8. Milestones

### Milestone 1: Schema + migration foundation

- Goal: add RBAC/identity DB primitives.
- Status: `done`

### Milestone 2: Identity resolution service

- Goal: resolve local identity + effective permissions from Clerk subject.
- Status: `done`

### Milestone 3: Middleware and route wiring

- Goal: attach identity context globally and enforce permission middleware.
- Status: `done`

### Milestone 4: Verification

- Goal: run formatting and tests.
- Status: `in_progress`

## 9. Verification Plan

- `gofmt -w .`
- `go test ./...`

## 10. Progress Log

- 2026-02-27: Added migration + schema for RBAC foundation.
- 2026-02-27: Added identity repo/service and shared authz permission model.
- 2026-02-27: Added middleware context + permission guard and router integration.

## 11. Outcomes And Follow-Ups

- Follow-up: implement groups/events domain routes that consume scoped RBAC checks (`groupId`, `eventId`).
- Follow-up: add policy matrix tests for admin/moderator/member overrides.

---

# ExecPlan: Go Core Social Write Path (Threads/Posts/Comments/Reactions/Media)

## 1. Title

Implement Phase 2 core social write path in `services/fphgo`

## 2. Objective

Deliver thread/post/comment/reaction/media-metadata write and read APIs with service-level ownership/moderator controls and pagination-safe list endpoints.

## 3. Scope

- Expand `chika` routes, handlers, service, and repo.
- Add DB migration and schema updates for:
  - thread ownership/mode/modification metadata
  - comments
  - thread reactions
  - media asset metadata

---

# ExecPlan: Abuse Surface Audit and Write Guardrail Expansion

## 1. Title

Abuse surface audit and guardrail expansion for migrated write endpoints

## 2. Objective

Ensure no obvious migrated write endpoint in profiles/blocks/reports/messaging/chika is left without at least one abuse control (rate limit or cooldown), and verify with integration tests + updated rate-limit documentation.

## 3. Scope

- Audit all migrated write endpoints across:
  - `profiles.write`
  - `blocks.write`
  - `reports.write`
  - messaging write endpoints
  - chika write endpoints
- Add missing service-layer rate limits/cooldowns.
- Add/expand integration tests for high-risk write endpoints.
- Update `services/fphgo/docs/rate-limits-v1.md`.

## 4. Constraints And Non-Goals

- Keep existing authz behavior unchanged; only add abuse controls.
- Keep limiter implementation on existing shared Postgres limiter.
- Non-goal: introduce Redis/external distributed throttling in this pass.

## 5. Acceptance Criteria

- Every obvious migrated write endpoint has rate limit/cooldown coverage.
- Rate-limit docs reflect actual enforced policy.
- Integration tests cover at least five high-risk write endpoints with 429 contract assertions.

## 6. Repo Evidence

- App wiring: `services/fphgo/internal/app/app.go`
- Feature routes:
  - `services/fphgo/internal/features/profiles/http/routes.go`
  - `services/fphgo/internal/features/blocks/http/routes.go`
  - `services/fphgo/internal/features/reports/http/routes.go`
  - `services/fphgo/internal/features/messaging/http/routes.go`
  - `services/fphgo/internal/features/chika/http/routes.go`
- Existing limiter infra: `services/fphgo/internal/shared/ratelimit/ratelimit.go`
- Existing contract doc: `services/fphgo/docs/rate-limits-v1.md`

## 7. Risks And Rollback

- Risk: limits too aggressive for legitimate bursts.
- Risk: constructor signature changes break dependency wiring/tests.
- Rollback: revert service-level limiter hooks and policy table; keep previous endpoint behavior.

## 8. Milestones

### Milestone 1: Endpoint audit and policy map

- Goal: identify write endpoints without guardrails.
- Status: `done`

### Milestone 2: Service-layer protection expansion

- Goal: add missing rate-limit/cooldown checks in profiles/blocks/messaging/chika writes.
- Status: `done`

### Milestone 3: Integration coverage expansion

- Goal: add HTTP integration assertions for missing high-risk writes.
- Status: `done`

### Milestone 4: Documentation and verification

- Goal: update `rate-limits-v1.md` and run targeted tests.
- Status: `done`

## 9. Verification Plan

- `go test ./internal/features/profiles/http ./internal/features/blocks/http ./internal/features/reports/http ./internal/features/messaging/http ./internal/features/chika/http ./internal/app`

## 10. Progress Log

- 2026-02-27: Audited all migrated write routes and identified uncovered writes.
- 2026-02-27: Added service-level limits for profiles patch, blocks write, messaging transitions, and remaining chika writes.
- 2026-02-27: Added/expanded integration tests to assert 429 contract on high-risk endpoints.
- 2026-02-27: Updated rate-limits doc with full endpoint coverage.

## 11. Outcomes And Follow-Ups

- Outcome: migrated write surface now has explicit abuse controls and documented policy coverage.
- Follow-up: tune thresholds with production telemetry after first rollout window.

## 4. Constraints And Non-Goals

- Non-goal: full feed/ranking implementation.
- Non-goal: object-storage upload orchestration; only metadata persistence is in scope.

## 5. Acceptance Criteria

- CRUD baseline for threads and comments is live.
- Posts/comments/reactions/media metadata APIs exist with validation and policy checks.
- Reads use deterministic pagination parameters (`limit`, `offset`) where applicable.
- `go test ./...` passes.

## 6. Repo Evidence

- Existing baseline feature module: `services/fphgo/internal/features/chika/*`
- App route mount: `services/fphgo/internal/app/routes.go`
- Existing schema source: `services/fphgo/db/schema/000_schema.sql`

## 7. Risks And Rollback

- Risk: migration compatibility with legacy `chika_threads` rows lacking owner.
- Risk: widened route surface without domain tests can hide regressions.
- Rollback: revert `0003` migration and `internal/features/chika/*` changes.

## 8. Milestones

### Milestone 1: Schema and migration extension

- Goal: add social-write-path tables/columns.
- Status: `done`

### Milestone 2: Chika API expansion

- Goal: add thread/post/comment/reaction/media endpoints.
- Status: `done`

### Milestone 3: Policy enforcement

- Goal: enforce owner-or-moderator edits/deletes in service layer.
- Status: `done`

### Milestone 4: Verification

- Goal: run tests and confirm no breakage.
- Status: `done`

## 9. Verification Plan

- `go test ./...`

## 10. Progress Log

- 2026-02-27: Added `0003_core_social_write_path.sql` and updated schema snapshot.
- 2026-02-27: Rebuilt `chika` HTTP/service/repo layers for thread/post/comment/reaction/media metadata.
- 2026-02-27: Ran `go test ./...` successfully.

## 11. Outcomes And Follow-Ups

- 2026-02-27: Added chika_item2_audit.md, fixed correctness gaps (deleted parent blocks, media entity validation, stable ordering), added HTTP/service/repo tests. See `docs/audits/chika_item2_audit.md` and `docs/qa/chika_item2_manual_tests.md`.
- **Deferred:** Post PATCH/DELETE endpoints — not in Item 2 scope; add in future milestone if needed.
- Follow-up: wire media metadata to upload signing/object-store workflow.

---

# ExecPlan: Implement docs/specs/plans/\*\*

## 1. Title

Implement docs/specs/plans/\*\* (Phase-1 repository pass)

## 2. Objective

Deliver a concrete implementation pass aligned to `docs/specs/plans/*` by adding missing feature entry points and shipping a functional direct-messaging vertical slice.

## 3. Scope

- Add API messaging module (`/messages`) with conversation listing, direct conversation create/get, message list, and message send.
- Add web messages feature and `/messages` page wired to new API.
- Add web route scaffolds for remaining planned modules with no current route implementation (`/competitive-records`, `/training-logs`, `/safety`, `/awareness`, `/marketplace`, `/collaboration`).
- Update navigation so implemented routes are reachable.

## 4. Constraints And Non-Goals

- No DB migration generation in this pass.
- No full moderation/reporting/audit stack implementation.
- No payment/contract features for marketplace/collaboration (matches plan gating).

## 5. Acceptance Criteria

- `/messages` API routes are registered and type-check.
- `/messages` web page can list conversations and send messages via API contracts.
- Every plan area has at least an implemented user-facing entry route in web (full feature depth deferred).
- API and web type-check pass.

## 6. Repo Evidence

- Plan source: `docs/specs/plans/README.md` and `docs/specs/plans/*.md`.
- Existing route registry: `apps/api/src/routes/app.routes.ts`.
- Existing messages schema: `apps/api/src/models/drizzle/messages.model.ts`.
- Missing web routes observed from app tree: `apps/web/src/app` and `apps/web/src/config/nav.ts`.

## 7. Risks And Rollback

- Risk: message route contracts mismatch existing frontend assumptions.
- Risk: strict TypeScript errors due Drizzle typings.
- Rollback: remove newly added messages modules and route registration; restore nav additions.

## 8. Milestones

### Milestone 1: API messages vertical slice

- Goal: ship `messages` endpoints with validation and policy checks.
- Inputs/Dependencies: `messages.model.ts`, `clerk.middleware.ts`.
- Changes: add `apps/api/src/app/messages/*`, wire in `app.routes.ts`.
- Validation Commands: `pnpm --filter @freediving.ph/api type-check`.
- Expected Evidence: no type errors; routes compile.
- Rollback Notes: remove `apps/api/src/app/messages` and route entry.
- Status: `done`

### Milestone 2: Web messages feature + page

- Goal: enable route `/messages` with conversation and message flows.
- Inputs/Dependencies: `axios` client, Clerk auth, React Query.
- Changes: add `apps/web/src/features/messages/*`, `apps/web/src/app/messages/page.tsx`.
- Validation Commands: `pnpm --filter @freediving.ph/web type-check`.
- Expected Evidence: no type errors; page compiles.
- Rollback Notes: remove feature folder and page, restore exports/nav.
- Status: `done`

### Milestone 3: Plan coverage route scaffolds

- Goal: add implemented entry pages for remaining plan modules.
- Inputs/Dependencies: App Router and shared UI components.
- Changes: add pages under `apps/web/src/app/*` and update nav config.
- Validation Commands: `pnpm --filter @freediving.ph/web type-check`.
- Expected Evidence: all routes compile and are reachable from nav.
- Rollback Notes: remove new routes and nav entries.
- Status: `done`

## 9. Verification Plan

- `pnpm --filter @freediving.ph/api type-check`
- `pnpm --filter @freediving.ph/web type-check`

## 10. Progress Log

- 2026-02-16: Collected plan files and implementation coverage evidence.
- 2026-02-16: Implemented API messaging module and wired `/messages` routes.
- 2026-02-16: Implemented web messages feature and `/messages` page.
- 2026-02-16: Added MVP scaffolds for competitive records, training logs, safety, awareness, marketplace, and collaboration pages.
- 2026-02-16: Ran `pnpm --filter @freediving.ph/api type-check` and `pnpm --filter @freediving.ph/web type-check` successfully.

## 11. Outcomes And Follow-Ups

- Completed a repository-wide first pass aligned to `docs/specs/plans/**` by shipping missing entry points and a functional direct messaging vertical slice.
- Follow-up: add DB migrations and deeper Phase 2/3 controls (reporting, moderation actions, audit logs, anti-abuse rules) for each module.

---

# ExecPlan: Sequential Implementation (00 -> 14)

## 1. Title

Sequential implementation under `docs/specs/plans` from `00` to `14`

## 2. Objective

Implement plan items in strict numerical order, completing each module baseline before moving to the next.

## 3. Scope

- `00`: cross-cutting foundation (reporting, policy checks, account status gating, audit event logging baseline)
- `01` -> `14`: feature-by-feature enhancements in order

## 4. Constraints And Non-Goals

- Keep each stage independently compilable.
- Defer deeper Phase 2/3 controls unless explicitly included in current stage.

## 5. Acceptance Criteria

- Each numbered plan has corresponding implementation evidence in code before the next is marked complete.

## 6. Repo Evidence

- Plan files: `docs/specs/plans/00-cross-cutting-foundation.md` ... `docs/specs/plans/14-collaboration-hub.md`

## 7. Risks And Rollback

- Risk: moving too many modules at once causes contract drift.
- Rollback: revert only files touched in current numbered stage.

## 8. Milestones

### Milestone 00: Cross-Cutting Foundation

- Goal: ship generic reporting workflow + centralized report policy enforcement + active-account gating.
- Status: `done`

### Milestone 01: Profiles

- Goal: align profile visibility and PB/profile feed controls.
- Status: `done`

### Milestone 02: Messaging

- Goal: extend DM rules to cover plan acceptance items.
- Status: `done`

### Milestone 03: Buddy System

- Goal: implement request lifecycle and rejection cooldown.
- Status: `done`

### Milestone 04: Groups

- Goal: implement join policy matrix and moderation queue actions.
- Status: `done`

### Milestone 05: Chika

- Goal: implement pseudonymous policy controls and moderation actions.
- Status: `done`

### Milestone 06: Explore

- Goal: implement moderation states and submission review.
- Status: `done`

### Milestone 07: Buddy Finder

- Goal: implement visibility/block-aware finder search.
- Status: `done`

### Milestone 08: Events

- Goal: enforce lifecycle/organizer edit boundaries with moderation controls.
- Status: `done`

### Milestone 09: Competitive Records

- Goal: records browse/submit/verify/reject/remove workflow.
- Status: `done`

### Milestone 10: Training Logs

- Goal: private-first logs with controlled sharing.
- Status: `done`

### Milestone 11: Safety and Rescue

- Goal: curated safety content + role-gated publishing.
- Status: `done`

### Milestone 12: Ocean Awareness

- Goal: awareness feed with citation-aware posting policy.
- Status: `done`

### Milestone 13: Marketplace

- Goal: policy-gated listing MVP with moderation hooks.
- Status: `done`

### Milestone 14: Collaboration Hub

- Goal: collaboration board MVP with anti-spam moderation baseline.
- Status: `done`

## 9. Verification Plan

- `pnpm --filter @freediving.ph/api type-check`
- `pnpm --filter @freediving.ph/web type-check`

## 10. Progress Log

- 2026-02-16: Began strict sequential run from `00`.
- 2026-02-16: Added `moderation.model.ts` with `blocks`, `reports`, and `audit_logs`.
- 2026-02-16: Added reports API module (`/reports`) and policy middleware hooks.
- 2026-02-16: Added account-status guard in auth middleware.
- 2026-02-16: Added web reusable report action + visibility selector components.
- 2026-02-16: Verified `00` changes with API/Web type-check passes.
- 2026-02-16: Started `01` with profile visibility fields and Personal Bests model + profile API endpoints.
- 2026-02-16: Added web profile integration for visibility and personal best management.
- 2026-02-16: Started `02` hardening by enforcing DM daily send limits and block checks in messaging service.
- 2026-02-16: Completed `02` with sender-delete placeholders, moderator remove flow, account-age gating (`<24h`), and conversation/message-level reporting actions.
- 2026-02-16: Moved messaging/report contracts to `packages/types` and validated package + app consumers.
- 2026-02-16: Completed `03` + `07` with buddy request lifecycle, rejection cooldown, daily limits, active buddy graph, and block-aware buddy finder API + web integration.
- 2026-02-16: Completed `04` by enforcing owner non-removability and owner membership bootstrap on group creation.
- 2026-02-16: Completed `05` by adding pseudonymous Chika support with per-thread pseudonym generation and pseudonymous account-age gating.
- 2026-02-16: Completed `06` by adding dive-spot moderation state lifecycle and review endpoint with published-only public reads.
- 2026-02-16: Completed `08` by enforcing organizer update boundaries after start time and moderator removal path.
- 2026-02-16: Completed `09` through `14` backend MVP modules (competitive records, training logs, safety resources, awareness, marketplace, collaboration) and wired matching web data integrations.
- 2026-02-16: Validated `packages/types`, API, and web type-checks after all sequential milestones.

## 11. Outcomes And Follow-Ups

- `00` through `14` sequential milestones are implemented and type-check verified.
- Follow-up: add integration tests and DB migrations for all new models/endpoints before release.

---

# ExecPlan: Consolidate Shared Types To packages/types

## 1. Title

Consolidate shared API/web contracts into `packages/types/src` and remove web-local feature `types.ts`

## 2. Objective

Make `packages/types/src/index.ts` the single source of truth for shared contracts used by `apps/api` and `apps/web`, and remove feature-local type definitions under `apps/web/src/features/*/types.ts`.

## 3. Scope

- Move all web feature `types.ts` contracts into `packages/types/src/index.ts`.
- Rewire web imports to `@freediving.ph/types`.
- Delete web feature `types.ts` files.
- Update AGENTS guidance to enforce this convention.

## 4. Constraints And Non-Goals

- No behavioral API changes; contract relocation only.
- No DB schema or migration updates.
- Preserve existing feature runtime behavior.

## 5. Acceptance Criteria

- No `apps/web/src/features/*/types.ts` files remain.
- Web feature modules compile using `@freediving.ph/types` imports.
- `packages/types` and `apps/web` type-check pass.
- AGENTS documentation explicitly states the shared-types rule.

## 6. Repo Evidence

- Existing local web types: `apps/web/src/features/*/types.ts`.
- Shared types package entrypoint: `packages/types/src/index.ts`.
- Existing AGENTS guidance: `AGENTS.md`, `apps/web/AGENTS.md`, `packages/types/AGENTS.md`.

## 7. Risks And Rollback

- Risk: incorrect mass import rewrites causing broken module paths.
- Risk: duplicate/ambiguous re-exports in feature barrel files.
- Rollback: restore previous import paths and recreate deleted `types.ts` files from git history.

## 8. Milestones

### Milestone 1: Centralize contracts in `packages/types`

- Goal: migrate all shared feature contracts into `packages/types/src/index.ts`.
- Inputs/Dependencies: existing web feature `types.ts` files.
- Changes: expanded exports in `packages/types/src/index.ts`.
- Validation Commands: `pnpm --filter @freediving.ph/types type-check`.
- Expected Evidence: no package type errors.
- Rollback Notes: revert `packages/types/src/index.ts`.
- Status: `done`

### Milestone 2: Rewire web consumers and remove local types

- Goal: web features import shared contracts from `@freediving.ph/types` only.
- Inputs/Dependencies: milestone 1 exports.
- Changes: import updates in `apps/web/src`, delete `apps/web/src/features/*/types.ts`.
- Validation Commands: `pnpm --filter @freediving.ph/web type-check`.
- Expected Evidence: no unresolved imports/type errors in web.
- Rollback Notes: restore deleted files and old imports.
- Status: `done`

### Milestone 3: Update AGENTS guidance

- Goal: codify shared-types location policy.
- Inputs/Dependencies: repo AGENTS files.
- Changes: update `AGENTS.md`, `apps/web/AGENTS.md`, `packages/types/AGENTS.md`.
- Validation Commands: manual diff review.
- Expected Evidence: explicit instruction to avoid web-local `types.ts`.
- Rollback Notes: revert AGENTS edits.
- Status: `done`

## 9. Verification Plan

- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web type-check`

## 10. Progress Log

- 2026-02-16: inventoried all web feature `types.ts` files and current shared package exports.
- 2026-02-16: migrated contracts into `packages/types/src/index.ts`.
- 2026-02-16: rewired web imports, removed local feature `types.ts`, and updated AGENTS documentation.
- 2026-02-16: validated `@freediving.ph/types` type-check and `@freediving.ph/web` type-check; `@freediving.ph/types` test is blocked in sandbox by `tsx` IPC pipe permission (`EPERM`).

## 11. Outcomes And Follow-Ups

- Completed type-contract consolidation and web-local type-file removal.
- Follow-up: run `pnpm --filter @freediving.ph/types test` in an environment that allows `tsx` IPC socket creation.

---

# ExecPlan: Diving Modules Production Pass + vis.gl Map Migration

## 1. Title

Implement diving modules production pass with `@vis.gl/react-google-maps`

## 2. Objective

Replace legacy map integration and harden Explore, Buddy Finder, Events, and Competitive Records flows to match production-ready behavior in the current stack.

## 3. Scope

- Replace web map implementation from `@react-google-maps/api` to `@vis.gl/react-google-maps`.
- Add viewport/search/difficulty filtering support for dive spots API and web Explore flow.
- Improve web Buddy Finder and Events filters wiring.
- Improve Competitive Records query wiring and list filtering.
- Keep existing DB schema intact for this pass.

## 4. Constraints And Non-Goals

- No destructive migration rewrite in this pass.
- No full PostGIS migration in this coding pass.
- No third-party federation integration (AIDA/CMAS).

## 5. Acceptance Criteria

- Explore map renders via `@vis.gl/react-google-maps` and marker selection syncs with list cards.
- Dive spot list endpoint supports search + bounds + difficulty filtering.
- Buddy Finder UI supports search, location, and experience filters via API.
- Events page search/filter state drives API list requests.
- Competitive Records list supports user-provided filter params.

## 6. Repo Evidence

- Existing map provider: `apps/web/src/providers/map-provider.tsx`
- Existing Explore map components: `apps/web/src/app/explore/maps/*`
- Existing dive spot API module: `apps/api/src/app/diveSpot/*`
- Existing buddy/events/records web features: `apps/web/src/features/{buddies,events,competitiveRecords}`

## 7. Risks And Rollback

- Risk: new map package not installed in local lockfile.
- Risk: strict TS mismatch across shared DTOs.
- Rollback: revert map provider and Explore component files + API query changes.

## 8. Milestones

### Milestone 1: Map migration + Explore query hardening

- Goal: `@vis.gl` map rendering and filterable dive spot retrieval.
- Status: `done`

### Milestone 2: Buddy, events, and records UI filter wiring

- Goal: production-friendly filter/search behavior for module pages.
- Status: `done`

### Milestone 3: Validation and cleanup

- Goal: run targeted type-checks and resolve regressions.
- Status: `done`

## 9. Verification Plan

- `pnpm --filter @freediving.ph/api type-check`
- `pnpm --filter @freediving.ph/web type-check`

## 10. Progress Log

- 2026-02-17: Audited current module implementations and identified map and contract gaps.
- 2026-02-17: Replaced web map provider and map container to `@vis.gl/react-google-maps` API surface.
- 2026-02-17: Added Explore viewport, search, difficulty, and sort-driven list/map query behavior.
- 2026-02-17: Extended dive spot backend query schema and service filtering for bounds and text search.
- 2026-02-17: Added buddy finder location/experience filters and events search wiring.
- 2026-02-17: Added competitive records list filtering in web feature hooks.
- 2026-02-17: Verified `@freediving.ph/api` and `@freediving.ph/web` type-check pass.

## 11. Outcomes And Follow-Ups

- Map integration is migrated in source code, with an ambient type shim to keep compile green until dependency installation is refreshed.
- Follow-up: run `pnpm install` to update lockfile and fetch `@vis.gl/react-google-maps` package before production build/deploy.

---

# ExecPlan: Web Alignment To FPHGO (Base URL, Versioned Routes, Unified Session Guard)

## 1. Title

Align `apps/web` API and auth/session behavior to `services/fphgo`.

## 2. Objective

Eliminate route/base URL/auth drift by centralizing FPHGO base URL and route construction, moving messages/chika/session calls to v1 routes, and enforcing one session source with safe loading behavior in guards.

## 3. Scope

- `apps/web` only.
- New centralized modules:
  - `src/lib/api/fphgo-base-url.ts`
  - `src/lib/api/fphgo-routes.ts`
  - `src/lib/api/fphgo-fetch.ts`
- Migrate messages/chika/auth-session call sites to use centralized route + fetch paths.
- Replace split auth session layers with `useSession`.
- Update env/docs/tests for FPHGO integration.

## 4. Constraints And Non-Goals

- Do not modify `apps/api/*`.
- Do not modify `services/fphgo` routes to match web.
- Keep Clerk + React Query + Next.js architecture.
- Non-goal: full messages domain parity where FPHGO does not yet expose legacy endpoints.

## 5. Acceptance Criteria

- Web uses one authoritative FPHGO base URL helper.
- Go-feature calls are `/v1`-prefixed and route-built centrally.
- `AuthGuard` never denies while authz/session data is still loading.
- Session query key is unified (`["session"]`).
- Tests cover base URL, `/v1` route discipline, and guard behavior.

## 6. Repo Evidence

- API clients: `apps/web/src/lib/api/client.ts`, `apps/web/src/lib/api/server.ts`, `apps/web/src/lib/http/axios.ts`
- Feature endpoints: `apps/web/src/features/messages/api/messages.ts`, `apps/web/src/features/chika/api/threads.ts`
- Auth/session split: `apps/web/src/hooks/react-queries/auth.ts`, `apps/web/src/features/auth/auth-gate.tsx`, `apps/web/src/components/auth/guard.tsx`
- FPHGO routes source of truth (read-only): `services/fphgo/internal/app/routes.go`, `services/fphgo/internal/features/messaging/http/routes.go`, `services/fphgo/internal/features/chika/http/routes.go`, `services/fphgo/internal/features/auth/http/routes.go`

## 7. Risks And Rollback

- Risk: messages/chika payload model mismatch because FPHGO schemas differ from legacy TS DTO assumptions.
- Risk: hidden call sites may still use older axios path strings outside touched features.
- Rollback: revert `apps/web` files listed under milestones and restore previous API clients/hooks.

## 8. Milestones

### Milestone 1: Audit and route/auth truth map

- Goal: inventory non-v1 paths, client layers, and auth/session duplication.
- Status: `done`

### Milestone 2: Base URL + route centralization

- Goal: add reusable base URL and v1 route builder modules and migrate high-risk call sites.
- Status: `done`

### Milestone 3: Fetch wrapper + client/server delegation

- Goal: centralize token/header/error behavior and `/v1` dev assertion.
- Status: `done`

### Milestone 4: Unified session source + guard loading safety

- Goal: collapse to one session hook and prevent early deny while loading.
- Status: `done`

### Milestone 5: Docs + regression tests + verification

- Goal: codify env/run steps and add tests for route/authz guardrails.
- Status: `done`

## 9. Verification Plan

- `pnpm -C apps/web test`
- `pnpm -C apps/web type-check`
- `rg -n 'axiosInstance\.(get|post|put|patch|delete)\("/(messages|threads)' apps/web/src`
- `rg -n 'queryKey:\s*\["auth",\s*"session"\]|\["auth",\s*"session"\]' apps/web/src`

## 10. Progress Log

- 2026-02-27: Added centralized base URL, route builders, and shared FPHGO fetch wrapper.
- 2026-02-27: Rewired auth/session to `useSession` and updated `AuthGuard` to defer denial while loading.
- 2026-02-27: Migrated messages/chika API modules to v1 route builders and centralized fetch.
- 2026-02-27: Added env/docs updates and regression contract tests for base URL/routes/fetch/guard behavior.
- 2026-02-27: `pnpm -C apps/web test` passed; `pnpm -C apps/web type-check` failed on pre-existing UI `asChild` typing issues in nav components.

## 11. Outcomes And Follow-Ups

- Follow-up: reconcile TS DTOs in `@freediving.ph/types` with FPHGO response models for stronger runtime correctness (especially messages/chika IDs/payload shape).
- Follow-up: migrate remaining legacy axios feature modules to centralized route builders once corresponding FPHGO endpoints are confirmed.

---

# ExecPlan: Web-Go API Compatibility And Authz Hardening

## 1. Title

Close API contract gaps between `apps/web` and `services/fphgo`, standardize shared TS contracts, tighten authz defaults, and add contract tests.

## 2. Objective

Align web API consumers to the active Go `/v1` surface, remove broad member write defaults, and gate core contracts with tests that catch routing/auth/shape regressions.

## 3. Scope

- Build and maintain a compatibility matrix document with file-level evidence.
- Add shared contracts in `packages/types` for `MeResponse`, `Permission`, `Role`, `ApiError`.
- Normalize web error parsing to shared `ApiError`.
- Normalize Go auth/error contract codes and add router-level contract tests.
- Introduce granular permission constants, granular route enforcement, and staged backfill migration.

## 4. Constraints And Non-Goals

- Do not change `apps/api/*`.
- Web must conform to Go routes; do not redesign Go around legacy web assumptions.
- Non-goal: full redesign of messaging conversation domain model.

## 5. Acceptance Criteria

- Matrix exists at `services/fphgo/docs/api-compatibility-matrix.md` with exact web+go file references.
- `packages/types` exports shared `MeResponse`, `Permission`, `Role`, and `ApiError`.
- Web session/error consumers use shared contracts.
- `member` no longer gets broad `content.write` by default.
- Go tests include app-level contract checks for `/v1` prefix, auth enforcement, and core response shapes.

## 6. Repo Evidence

- Web route helpers and callers: `apps/web/src/lib/api/fphgo-routes.ts`, `apps/web/src/features/{auth,messages,chika}/api/*.ts`
- Go router wiring: `services/fphgo/internal/app/routes.go`
- Go feature route files: `services/fphgo/internal/features/*/http/routes.go`
- Authz model: `services/fphgo/internal/shared/authz/authz.go`
- Error writer: `services/fphgo/internal/shared/httpx/respond.go`

## 7. Risks And Rollback

- Risk: tightened permissions could deny expected writes.
- Risk: error code normalization could break clients expecting legacy uppercase codes.
- Rollback:
  - Revert `0005_authz_granular_permissions.sql` via goose down.
  - Revert granular route checks back to legacy content permissions if needed.
  - Revert web shared-type imports to previous local types if emergency rollback is required.

## 8. Milestones

### Milestone 1: Compatibility matrix baseline

- Goal: produce web-vs-go route truth document with priorities.
- Status: `done`

### Milestone 2: Shared TS contract standardization

- Goal: centralize session/authz/error types in `packages/types` and wire web consumers.
- Status: `done`

### Milestone 3: Authz tightening + migration

- Goal: introduce granular permissions, remove broad member write default, and add backfill migration/docs.
- Status: `done`

### Milestone 4: Contract-level integration tests

- Goal: test `/v1` prefix, auth middleware enforcement, and P0 response shapes.
- Status: `done`

### Milestone 5: Verification

- Goal: run targeted workspace checks and Go tests.
- Status: `done`

## 9. Verification Plan

- `pnpm -C packages/types type-check`
- `pnpm -C apps/web type-check` (known pre-existing UI typing failures outside this change set)
- `go test ./...` from `services/fphgo`

## 10. Progress Log

- 2026-02-27: Added compatibility matrix with endpoint-level web/go mapping and priorities.
- 2026-02-27: Added shared API types in `packages/types/src/api/*` and rewired web session/error parsing.
- 2026-02-27: Switched Go route auth checks from broad `content.*` to granular `messaging.*`/`chika.*`.
- 2026-02-27: Added `0005_authz_granular_permissions.sql` and `docs/authz-permissions-v1.md`.
- 2026-02-27: Added app-level contract tests using injected test auth middleware and stub `/v1` routers.

## 11. Outcomes And Follow-Ups

- Open gap: `POST /v1/messages/send` request shape mismatch from web numeric conversation IDs to Go UUID recipient contract.
- Follow-up: decide whether web should carry recipient UUID through conversation state or introduce a dedicated conversation-message send route contract.

---

# ExecPlan: Profiles v1 + Blocks v1 (Go + Web)

## 1. Title

Implement Profiles v1 and Blocks v1 with service-layer enforcement across Messaging and Chika

## 2. Objective

Ship the first real profile feature set on `services/fphgo` with `/v1` contracts used by `apps/web`, and introduce user blocking with enforcement in messaging and chika read/write paths.

## 3. Scope

- `services/fphgo`:
  - Profiles routes: `GET /v1/me/profile`, `PATCH /v1/me/profile`, `GET /v1/profiles/{userID}`, `GET /v1/users/search`
  - Blocks routes: `POST /v1/blocks`, `DELETE /v1/blocks/{blockedUserId}`, `GET /v1/blocks`
  - Service policy enforcement for blocks in messaging and chika.
  - Per-feature `sqlc` packages for profiles and blocks.
  - Goose migration updates for profile fields/search and `user_blocks`.
- `packages/types`:
  - Shared profile and error/session contract alignment.
- `apps/web`:
  - Wire profile APIs/hooks/components to `/v1` Go routes and shared types.

## 4. Constraints And Non-Goals

- Do not touch `apps/api/*`.
- Keep handlers thin; business policy in services; repos DB-only.
- No Redis or new validation libraries.
- Non-goal: full legacy personal-bests migration in Go.

## 5. Acceptance Criteria

- Web profile screens call `/v1` only and work against `fphgo`.
- No duplicate profile/api-error types in web feature code.
- Profiles endpoints enforce `profiles.read`/`profiles.write`.
- Blocks endpoints exist and block policy is enforced in messaging/chika service paths.
- Tests cover unauthenticated/forbidden/success/validation and block policy behavior.

## 6. Repo Evidence

- Router/auth wiring: `services/fphgo/internal/app/routes.go`
- Existing identity/profile data model: `services/fphgo/db/schema/000_schema.sql`, `services/fphgo/internal/features/identity/*`
- Messaging/chika policy paths: `services/fphgo/internal/features/messaging/service/service.go`, `services/fphgo/internal/features/chika/service/service.go`
- Web profile caller surface: `apps/web/src/features/profiles/**/*`
- Shared contracts: `packages/types/src/index.ts`, `packages/types/src/api/*.ts`

## 7. Risks And Rollback

- Risk: migration and schema drift between legacy `blocks`/`profiles` and new contracts.
- Risk: route overlap with existing `/v1/users/*` paths.
- Risk: block filters accidentally over-hide content.
- Rollback:
  - revert new migration + schema updates
  - disable new mounts in app router
  - revert web profiles API calls to prior state

## 8. Milestones

### Milestone 1: Data + sqlc foundations

- Goal: add migration/schema and per-feature sqlc packages for profiles/blocks.
- Status: `done`

### Milestone 2: Profiles feature implementation

- Goal: implement repo/service/http and route guards for Profiles v1.
- Status: `done`

### Milestone 3: Blocks feature + enforcement

- Goal: implement blocks endpoints and enforce policy in messaging/chika service paths.
- Status: `done`

### Milestone 4: Web + shared contracts alignment

- Goal: wire `apps/web` profiles to `/v1` routes and shared package types.
- Status: `done`

### Milestone 5: Tests and docs

- Goal: add/adjust tests and update compatibility/docs.
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && make sqlc`
- `cd services/fphgo && go test ./...`
- `pnpm --filter @freediving.ph/types typecheck`
- `pnpm --filter @freediving.ph/web typecheck`

## 10. Progress Log

- 2026-02-27: Audited schema, authz, routes, users/profile web callers, and compatibility docs.
- 2026-02-27: Started milestone 1 implementation.
- 2026-02-27: Added migration `0006_profiles_blocks_v1.sql`, schema sync, sqlc packages, and generated code.
- 2026-02-27: Implemented profiles and blocks feature modules, app wiring, and block policy enforcement updates for messaging/chika.
- 2026-02-27: Updated web profiles API/hooks/view to `/v1` and shared types.
- 2026-02-27: Added tests and docs (`profiles-v1.md`, `blocks-v1.md`) and updated compatibility matrix.

## 11. Outcomes And Follow-Ups

- Follow-up: evaluate migration off legacy `/profiles/{username}` route after all web callers are `/v1`.
- Follow-up: decide whether to retire legacy `blocks` table after `user_blocks` rollout stabilizes.

---

# ExecPlan: Blocks v1 Enforcement (Messaging + Chika)

## 1. Title

Enforce block policy in messaging/chika read-write paths with integration proof and web guardrails

## 2. Objective

Guarantee that block relationships are enforced consistently in messaging and chika service paths, documented in compatibility docs, and verified by tests that exercise auth-protected routes.

## 3. Scope

- `services/fphgo/internal/features/messaging/*`
- `services/fphgo/internal/features/chika/*`
- `services/fphgo/docs/blocks-v1.md`
- `services/fphgo/docs/api-compatibility-matrix.md`
- `apps/web/src/app/messages/page.tsx`
- `apps/web/src/app/chika/[id]/page.tsx`

## 4. Constraints And Non-Goals

- Do not touch `apps/api/*`.
- Keep policy logic in services/repo layers, not handlers.
- Prefer SQL list filtering; use service-level block helper for write gating.

## 5. Acceptance Criteria

- Messaging send/request acceptance blocked both directions with `code: "blocked"`.
- Messaging inbox/requests hide blocked relationships.
- Chika thread/comment lists hide blocked authors both directions.
- Chika writes keep blocked enforcement with `code: "blocked"`.
- Integration tests cover enforcement behavior.

## 6. Milestones

### Milestone 1: Inventory and docs update

- Goal: record affected endpoints and enforcement coverage.
- Status: `done`

### Milestone 2: Shared helper enforcement

- Goal: use `IsBlockedEitherDirection` helper in messaging and chika services.
- Status: `done`

### Milestone 3: Test coverage

- Goal: add integration tests for messaging/chika enforcement and repo filtering.
- Status: `done`

### Milestone 4: Web guardrails

- Goal: blocked-send UX clarity and resilient UI when filtered items disappear.
- Status: `done`

## 7. Verification Plan

- `cd services/fphgo && go test ./internal/features/messaging/... ./internal/features/chika/...`
- `cd services/fphgo && go test ./...`

## 8. Progress Log

- 2026-02-27: Switched messaging block checks to shared `IsBlockedEitherDirection` helper and enforced accept transition.
- 2026-02-27: Added messaging/chika enforcement integration tests and repo-level filtering tests.
- 2026-02-27: Updated blocks/compatibility docs with explicit endpoint-level enforcement matrix.
- 2026-02-27: Hardened web messages/chika pages for blocked or disappearing conversation/thread scenarios.

# ExecPlan: Moderation Actions v1 (Audit-Backed Report Resolution)

## 1. Title

Implement Moderation Actions v1 in `services/fphgo` with minimal `apps/web` wiring.

## 2. Objective

Allow moderators to resolve reports through concrete account/content actions with immutable audit logging and permission-gated endpoints.

## 3. Scope

- `services/fphgo`:
  - new feature package `internal/features/moderation_actions` (repo/sqlc + service + http routes)
  - new migration + schema sync for `moderation_actions` and Chika `hidden_at` columns
  - route wiring under `/v1/moderation/*`
  - permission model updates (`moderation.read`, `moderation.write`)
  - chika read-path filtering: hidden items suppressed for members, visible to moderators
  - integration tests for authz, audit writes, and hidden-content visibility rules
  - docs: `docs/moderation-actions-v1.md` + compatibility matrix update
- `apps/web`:
  - minimal FPHGO route/client wiring for moderation action calls

## 4. Constraints And Non-Goals

- Do not touch `apps/api/*`.
- Follow `services/fphgo/AGENTS.md` layering/validation rules.
- No Redis/external service additions.
- Non-goal: building a full moderation dashboard UI in this task.

## 5. Acceptance Criteria

- Endpoints exist and are permission-protected with `RequireMember` + `RequirePermission`.
- Account actions (`suspend`, `unsuspend`, `read_only`, `clear`) and content actions (thread/comment `hide`/`unhide`) execute atomically with audit write.
- Hidden thread/comment list behavior differs by role (member filtered, moderator visible).
- Integration tests cover 401/403, audit record creation, and hidden-content visibility behavior.

## 6. Repo Evidence

- Router wiring and guards: `services/fphgo/internal/app/routes.go`, `services/fphgo/internal/middleware/clerk_auth.go`
- Permission model: `services/fphgo/internal/shared/authz/authz.go`
- Reports/chika feature patterns: `services/fphgo/internal/features/reports/*`, `services/fphgo/internal/features/chika/*`
- Schema and migration drift checks: `services/fphgo/db/schema/000_schema.sql`, `services/fphgo/db/schema_drift_test.go`
- Web FPHGO route wiring: `apps/web/src/lib/api/fphgo-routes.ts`, `apps/web/src/features/reports/api/reports.ts`

## 7. Risks And Rollback

- Risk: schema drift if migration and schema snapshot diverge.
- Risk: hidden filtering could unintentionally hide moderator-visible content.
- Risk: permission updates could overgrant/undergrant moderator access.
- Rollback:
  - revert new migration and schema updates
  - unmount moderation routes and revert authz constants
  - revert chika list filtering changes

## 8. Milestones

### Milestone 1: Data model and sqlc foundation

- Goal: add `moderation_actions` table, add chika hidden columns, generate feature sqlc.
- Status: `done`

### Milestone 2: Feature implementation and route wiring

- Goal: implement moderation_actions repo/service/http and mount `/v1/moderation` endpoints with permissions.
- Status: `done`

### Milestone 3: Hidden-content enforcement hooks

- Goal: ensure hidden thread/comment list filtering for members with moderator visibility preserved.
- Status: `done`

### Milestone 4: Integration tests

- Goal: cover 401/403, audit writes, and visibility behavior.
- Status: `done`

### Milestone 5: Docs and web wiring

- Goal: add moderation actions docs, compatibility update, and minimal web route/api wiring.
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && make sqlc`
- `cd services/fphgo && go test ./internal/features/moderation_actions/... ./internal/features/chika/http/... ./internal/app/... ./db/...`
- `cd services/fphgo && go test ./...`
- `pnpm -C apps/web type-check` (or narrow checks if full type-check has known unrelated failures)

## 10. Progress Log

- 2026-02-27: Captured scope, constraints, and implementation milestones.
- 2026-02-27: Added migration `0009_moderation_actions_v1.sql`, schema snapshot updates, and sqlc generation target for moderation actions.
- 2026-02-27: Implemented `internal/features/moderation_actions` repo/service/http and mounted `/v1/moderation` routes behind `moderation.write`.
- 2026-02-27: Added `moderation.read`/`moderation.write` to authz role permissions for moderator/admin/super_admin.
- 2026-02-27: Updated Chika list filtering to hide `hidden_at` rows for members and include for moderator/admin/super_admin.
- 2026-02-27: Added integration tests for moderation authz + audit behavior and chika hidden-content visibility behavior.
- 2026-02-27: Updated docs (`moderation-actions-v1.md`, compatibility matrix addendum) and minimal web route/client wiring.
- 2026-02-27: Verified `go test ./...` passes in `services/fphgo`; `pnpm -C apps/web type-check` fails only on pre-existing `asChild` typing errors in nav components.

## 11. Outcomes And Follow-Ups

- Moderation Actions v1 is implemented with permissioned, auditable account/content actions and hidden-content list enforcement by role.
- Follow-up: add a moderation read endpoint for audit browsing if moderator timeline UI is prioritized.
- Follow-up: resolve existing `apps/web` `asChild` typing errors in nav components to restore clean workspace-wide type-check.

# ExecPlan: Operational Guardrails v1 (Rate Limits + Cursor Pagination)

## 1. Title

Implement operational guardrails in `services/fphgo` and minimal compatibility wiring in `apps/web`.

## 2. Objective

Throttle abusive write behavior and standardize list pagination semantics before scale traffic.

## 3. Scope

- `services/fphgo`:
  - shared rate limit utility (`internal/shared/ratelimit`) backed by PostgreSQL
  - migration + schema sync for rate limit table
  - service-layer abuse controls for messaging and chika writes
  - preserve and document reports cooldown/cap policy
  - shared pagination helper (`internal/shared/pagination`) for limit clamp and cursor handling
  - cursor-based standardization for: messages inbox, chika threads, chika comments, reports list, blocks list
  - integration tests for `429 rate_limited` and stable cursor/ordering behavior
  - docs: `docs/rate-limits-v1.md`
- `apps/web`:
  - no API break wiring changes required in this task unless needed for compatibility.

## 4. Constraints And Non-Goals

- Do not touch `apps/api/*`.
- Follow `services/fphgo/AGENTS.md` layering and validation rules.
- No Redis or external rate-limit infrastructure.
- Non-goal: distributed global throttling across regions.

## 5. Acceptance Criteria

- Messaging and chika write bursts are throttled with HTTP `429` and `code: rate_limited`.
- Reports abuse controls remain active and documented.
- Cursor format/order semantics are consistent across targeted list endpoints.
- Stable `nextCursor` behavior verified by tests.

## 6. Repo Evidence

- Messaging service/repo/http: `services/fphgo/internal/features/messaging/*`
- Chika service/repo/http: `services/fphgo/internal/features/chika/*`
- Reports list/cooldown: `services/fphgo/internal/features/reports/*`
- Blocks list pagination: `services/fphgo/internal/features/blocks/*`
- Current schema and migration checks: `services/fphgo/db/schema/000_schema.sql`, `services/fphgo/db/schema_drift_test.go`

## 7. Risks And Rollback

- Risk: over-aggressive limits could degrade normal UX.
- Risk: pagination contract drift could break consumers expecting old offset shape.
- Rollback:
  - revert limiter integration in services
  - revert cursor handler/service/repo changes
  - revert migration/schema additions

## 8. Milestones

### Milestone 1: Shared foundations

- Goal: add `ratelimit` + `pagination` shared packages and DB migration/table.
- Status: `done`

### Milestone 2: Abuse controls

- Goal: enforce service-layer limits for messaging/chika; validate reports policy and error semantics.
- Status: `done`

### Milestone 3: Cursor pagination standardization

- Goal: move targeted list endpoints to unified cursor/limit behavior.
- Status: `done`

### Milestone 4: Tests and docs

- Goal: add integration coverage and `docs/rate-limits-v1.md`.
- Status: `done`

## 9. Verification Plan

- `cd services/fphgo && go test ./internal/features/messaging/... ./internal/features/chika/... ./internal/features/reports/... ./internal/features/blocks/... ./internal/shared/... ./db/...`
- `cd services/fphgo && go test ./...`

## 10. Progress Log

- 2026-02-27: Audited current cooldown/limit and pagination implementations and identified per-feature drift.
- 2026-02-27: Added migration `0010_operational_guardrails_v1.sql` and schema snapshot updates for `rate_limit_events`.
- 2026-02-27: Added `internal/shared/ratelimit` (PostgreSQL-backed event limiter) and `internal/shared/pagination` (limit clamp + cursor encode/decode).
- 2026-02-27: Enforced service-layer rate limits for messaging send/initiation and chika thread/post/comment create paths.
- 2026-02-27: Standardized cursor pagination behavior for messages inbox, chika threads/comments, reports list, and blocks list.
- 2026-02-27: Added integration tests for `429 rate_limited` and stable cursor pagination behavior, and documented policies in `docs/rate-limits-v1.md`.
- 2026-02-27: Verified with `go test ./internal/shared/... ./internal/features/messaging/... ./internal/features/chika/... ./internal/features/reports/... ./internal/features/blocks/... ./internal/app ./db` and `go test ./...`.

## 11. Outcomes And Follow-Ups

- Operational guardrails v1 are in place with documented, service-layer enforced abuse limits and standardized cursor semantics.
- Follow-up: add periodic cleanup/TTL compaction for `rate_limit_events` if table growth becomes material in production.

# ExecPlan: Contract and CI Gates v1 (Route Drift + Auth Regression)

## 1. Title

Implement CI and contract gates for `services/fphgo` to prevent route/auth regressions.

## 2. Objective

Fail PRs early when API route prefixes, authz behavior, or compatibility docs drift from expected contracts.

## 3. Scope

- GitHub Actions workflow updates for `services/fphgo` with Postgres-backed test run.
- Contract tests in Go for `/v1` route invariants and key endpoint JSON/error shapes.
- Auth-state regression tests for unauthenticated, no-permission, read_only, suspended behavior.
- Lightweight docs gate test for compatibility matrix required entries.

## 4. Constraints And Non-Goals

- Do not touch `apps/api/*`.
- Follow `services/fphgo/AGENTS.md` architecture and validation rules.
- Non-goal: full web-side contract coverage beyond minimal gate support.

## 5. Acceptance Criteria

- CI boots Postgres, applies migrations, runs sqlc/vet/tests for `services/fphgo`.
- Route/auth regressions fail via Go tests.
- Compatibility matrix drift for required migrated features fails via docs gate test.

## 6. Repo Evidence

- Existing workflow: `.github/workflows/ci.yml`
- Existing contract tests: `services/fphgo/internal/app/routes_contract_test.go`
- Existing auth middleware tests: `services/fphgo/internal/middleware/clerk_auth_test.go`
- Compatibility matrix doc: `services/fphgo/docs/api-compatibility-matrix.md`

## 7. Risks And Rollback

- Risk: strict route invariant checks may initially fail due known intentional exceptions.
- Risk: CI runtime increase from DB-backed tests.
- Rollback:
  - revert workflow job additions
  - loosen/adjust invariant allowlist in tests

## 8. Milestones

### Milestone 1: CI workflow hardening

- Goal: add dedicated `services/fphgo` CI job with Postgres, migrations, sqlc, vet, tests.
- Status: `pending`

### Milestone 2: Contract and auth regression tests

- Goal: add focused route/auth state contract tests in `internal/app`.
- Status: `pending`

### Milestone 3: Route surface + docs gate checks

- Goal: add route invariant and compatibility-matrix content checks.
- Status: `pending`

### Milestone 4: Verification

- Goal: run targeted and full Go tests.
- Status: `pending`

## 9. Verification Plan

- `cd services/fphgo && go test ./internal/app ./internal/middleware ./...`
- `cd services/fphgo && go vet ./...`
- `cd services/fphgo && go test ./...`

## 10. Progress Log

- 2026-02-27: Audited existing CI workflow and current contract/auth test coverage.

## 11. Outcomes And Follow-Ups

- Pending implementation.
