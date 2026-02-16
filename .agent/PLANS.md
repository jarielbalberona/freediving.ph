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
