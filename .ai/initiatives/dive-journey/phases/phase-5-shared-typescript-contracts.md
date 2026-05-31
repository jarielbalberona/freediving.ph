# Phase 5: Shared TypeScript Contracts

Status: passed

## Objective

Publish shared Journey API contracts so web and backend agree on timeline, visibility, source, media, and tagging shapes.

## Goal

Expose stable shared TypeScript API contracts for Journey reads, manual writes, media attachments, tagged users, and generated-entry references.

## Scope

- `packages/types/src/api`
- `packages/types/src/index.ts`
- `packages/types/test`

## Out Of Scope

- No backend behavior except fixing direct contract mismatches from prior phases.
- No web UI rendering.
- No downstream Dive Map, Badge, Passport, certification, event, or course implementation.

## Non-Goals

- Do not create feature-local cross-boundary DTOs in web.
- Do not encode Journey as proof, badge, credential, or Passport source data.

## Dependencies

- Phase 3 and Phase 4 backend API shapes.
- Existing `packages/types` conventions.
- `01-domain-model.md`.

## Tasks

- Add Journey entry DTOs and request/response contracts.
- Add visibility, type, source, media, and tagged-user shapes.
- Add manual create/update/hide/delete request contracts.
- Export contracts from `packages/types/src/index.ts`.
- Add or update shared type tests.

## Verification Requirements

- Contracts must expose `source_type` and `source_id`.
- Contracts must represent `public`, `followers`, and `private` or the product-approved fallback.
- Contract tests must cover manual and generated entry shapes.

## Verification Commands

- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`
- `git diff -- packages/types`
- `git diff --check`

## Expected Evidence

- Shared contracts compile.
- Contract tests cover Journey entry shape and manual write shapes.
- Generated-entry `source_type`/`source_id` fields are represented.
- No web feature-local cross-boundary DTOs are introduced.

## Repair Policy

Allowed repairs:

- TypeScript compile failures
- shared type test failures
- export/import mismatches
- formatting issues

Hard-stop for contract mismatch that requires backend behavior changes outside prior phase scope or unresolved visibility/type semantics.

## Stop Conditions

- Visibility/type semantics are unresolved.
- Contract would require source-domain behavior changes outside Journey.
- Backend and shared type shapes cannot be reconciled.

## Expected Report Output

- Contract files changed.
- Export paths changed.
- Shared type test evidence.
- Confirmation no web feature-local API DTOs were introduced.

## Completion Notes

Completed on 2026-05-31.

- Added shared Journey contracts under `packages/types/src/api/dive-journey.ts`.
- Exported contracts from `packages/types/src/index.ts`.
- Added contract tests for manual and generated Journey entry shapes.
- Contracts include `public | followers | private`, `sourceType/sourceId`, media IDs, and optional tagged-user presentation shapes.
