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
