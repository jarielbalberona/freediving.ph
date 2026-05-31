# Phase 5: Shared TypeScript Contracts

Status: passed

## Objective

Publish shared Passport contracts that encode aggregate sections, empty states, visibility filtering results, and optional presentation settings.

## Goal

Expose stable shared TypeScript API contracts for Passport aggregate and optional settings.

## Scope

- `packages/types/src/api`
- `packages/types/src/index.ts`
- `packages/types/test`

## Out Of Scope

- No backend behavior except fixing direct contract mismatches from prior phases.
- No web UI rendering.
- No child-system implementation.
- No source-data duplication.

## Non-Goals

- Do not create web-local cross-boundary DTOs.
- Do not encode Passport as a source-system contract.
- Do not omit empty-state representation.

## Dependencies

- Phase 2 aggregate contract design.
- Phase 3 backend API shape.
- Phase 4 settings API shape if implemented.
- Existing `packages/types` conventions.

## Tasks

- Add Passport aggregate DTOs and request/response contracts.
- Add section DTOs for diver summary, map preview, badge showcase, journey highlights, recent memories/media, and settings.
- Represent empty/fallback states explicitly.
- Add optional settings request/response contracts only if settings are implemented.
- Export contracts from `packages/types/src/index.ts`.
- Add or update shared type tests.

## Verification Requirements

- Contracts must include diver summary, map preview, badge showcase, journey highlights, recent memories/media, and settings/fallback fields.
- Empty states for missing map, empty journey, no badges, no memories/media, and new user profiles must be representable.
- Settings contracts, if present, must be presentation-only.

## Verification Commands

- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`
- `git diff -- packages/types`
- `git diff --check`

## Expected Evidence

- Shared contracts compile.
- Contract tests cover aggregate shape and empty states.
- Optional settings contracts compile if implemented.
- No web feature-local cross-boundary DTOs are introduced.

## Repair Policy

Allowed repairs:

- TypeScript compile failures.
- shared type test failures.
- export/import mismatches.
- formatting issues.

Hard-stop for contract mismatch that requires source-system ownership changes or unresolved visibility/settings semantics.

## Stop Conditions

- Contract requires source-system ownership changes.
- Visibility/settings semantics are unresolved.
- Empty-state behavior cannot be represented.

## Expected Report Output

- Contract files changed.
- Export paths changed.
- Shared type test evidence.
- Confirmation no feature-local web DTOs were introduced.

## Completion Notes

Completed on 2026-05-31.

- Added shared Passport aggregate and settings contracts in `packages/types/src/api/dive-passport.ts`.
- Exported Passport contracts from `packages/types/src/index.ts`.
- Added shared contract tests covering empty/unavailable sections and presentation-only settings.
- Did not add web-local DTOs, backend behavior, UI, child-system implementation, or source-data duplication.
