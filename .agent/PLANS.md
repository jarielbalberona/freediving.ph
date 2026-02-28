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

- Implemented as planned. Follow-up only if you want broader browser-level interaction coverage with a dedicated component-test harness or Playwright auth fixture.
