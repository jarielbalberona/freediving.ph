# Phase 8: API/DTO Consistency And Shared Contracts Audit

Status: pending

## Objective

Ensure backend DTOs, shared TypeScript contracts, and web API clients stay consistent across the integrated profile experience.

## Goal

Audit and harden contract consistency for Badges, Map, Journey, Passport, and Profile composition.

## Scope

- `packages/types/src/api`.
- `packages/types/test`.
- Backend handler DTOs for profile badges, map, journey, passport.
- Web API clients/hooks for profile modules.

## Out Of Scope

- No new product behavior.
- No feature-local cross-boundary DTOs in web.
- No source-system ownership changes.

## Non-Goals

- Do not hide contract drift with ad hoc adapter code.
- Do not duplicate DTO definitions across features.
- Do not loosen types to avoid real mismatch.

## Dependencies

- Phase 1 report.
- Any contract changes from Phases 2 through 7.
- Existing `packages/types` conventions.

## Tasks

- Compare backend DTOs with shared TypeScript contracts.
- Verify badge source/visibility fields align.
- Verify map/journey/passport aggregate and empty-state contracts align.
- Add shared contract tests for integrated profile DTOs.
- Remove or flag feature-local cross-boundary DTO drift.

## Verification Requirements

- Shared types type-check and tests are mandatory.
- Web type-check must pass after contract alignment.

## Verification Commands

- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web type-check`
- `cd services/fphgo && go test ./internal/features/profiles/...`
- `cd services/fphgo && go test ./internal/app/...`
- `git diff --check`

## Expected Evidence

- Contract audit results.
- Shared type test evidence.
- Web type-check evidence.
- Route snapshot evidence if routes changed.

## Repair Policy

Allowed repairs:

- contract export/import fixes.
- DTO alignment fixes.
- shared type tests.
- route snapshot updates when routes intentionally changed.
- formatting issues.

Hard-stop if DTO alignment requires changing source ownership or unresolved product semantics.

## Stop Conditions

- Backend/shared contracts conflict on ownership semantics.
- Web relies on feature-local DTOs that cannot be safely migrated.
- Contract fix would alter locked product rules.

## Expected Report Output

- Contract drift findings.
- Files changed.
- Type/test evidence.
- Remaining contract risks.

## Completion Notes

Filled by the execution skill or runner.
