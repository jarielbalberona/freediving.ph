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

# ExecPlan: Implement docs/specs/plans/**

## 1. Title
Implement docs/specs/plans/** (Phase-1 repository pass)

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
- Status: `pending`

### Milestone 04: Groups
- Goal: implement join policy matrix and moderation queue actions.
- Status: `pending`

### Milestone 05: Chika
- Goal: implement pseudonymous policy controls and moderation actions.
- Status: `pending`

### Milestone 06: Explore
- Goal: implement moderation states and submission review.
- Status: `pending`

### Milestone 07: Buddy Finder
- Goal: implement visibility/block-aware finder search.
- Status: `pending`

### Milestone 08: Events
- Goal: enforce lifecycle/organizer edit boundaries with moderation controls.
- Status: `pending`

### Milestone 09: Competitive Records
- Goal: records browse/submit/verify/reject/remove workflow.
- Status: `pending`

### Milestone 10: Training Logs
- Goal: private-first logs with controlled sharing.
- Status: `pending`

### Milestone 11: Safety and Rescue
- Goal: curated safety content + role-gated publishing.
- Status: `pending`

### Milestone 12: Ocean Awareness
- Goal: awareness feed with citation-aware posting policy.
- Status: `pending`

### Milestone 13: Marketplace
- Goal: policy-gated listing MVP with moderation hooks.
- Status: `pending`

### Milestone 14: Collaboration Hub
- Goal: collaboration board MVP with anti-spam moderation baseline.
- Status: `pending`

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

## 11. Outcomes And Follow-Ups
- `00`, `01`, and `02` are locked and verified.
- Proceed to `03` next.

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
