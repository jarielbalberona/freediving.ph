# Phase 6: Web Profile Journey UI

Status: pending

## Objective

Render Journey as a profile timeline while keeping all proof, badge, credential, and Passport meaning server-owned.

## Goal

Add the profile Journey UI section and manual-entry flows using backend APIs and shared contracts.

## Scope

- `apps/web/src/features/profile`
- Existing profile routes under `apps/web/src/app/profile/[username]` and `apps/web/src/app/[username]` as applicable.
- Existing API client and hook patterns.
- Shared contracts from `@freediving.ph/types`.
- Web tests following existing conventions.

## Out Of Scope

- No backend changes except fixing direct contract mismatches.
- No mobile implementation.
- No ranking/recommendation feed.
- No Passport UI.
- No badge verification UI.
- No Dive Map implementation.

## Non-Goals

- Do not calculate proof or visited counts in the browser.
- Do not imply Journey entries are verified achievements.
- Do not turn the profile Journey surface into Passport.

## Dependencies

- Phase 5 shared contracts.
- Phase 3 and Phase 4 backend APIs.
- Existing profile page/component conventions.
- AGENTS rule to prefer shadcn/ui composition and existing file structure.

## Tasks

- Add API client/hook support for Journey reads and manual writes.
- Add profile Journey timeline section with empty, loading, error, and populated states.
- Add manual entry create/update/delete or hide UI according to backend support.
- Add media attachment and tagging UI only if Phase 4 implemented backend support.
- Ensure UI copy and layout do not imply verification, proof, certification, or badge awarding.
- Add relevant web tests.

## Verification Requirements

- Web type-check is mandatory.
- Tests or documented static evidence must show manual entries without dive site/media render correctly.
- UI must consume shared contracts from `packages/types`.

## Verification Commands

- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web lint`
- `git diff -- apps/web packages/types`
- `git diff --check`

## Expected Evidence

- Web type-check passes.
- Relevant web tests pass.
- UI consumes shared contracts from `packages/types`.
- Manual entries can be represented without dive site or media.
- UI does not present Journey as proof or Passport.

## Repair Policy

Allowed repairs:

- TypeScript compile failures
- lint failures
- test failures inside changed web/profile modules
- contract import/export mismatches
- formatting issues

Hard-stop for unresolved UX decision around timeline presentation, missing backend contract needed by UI, or auth/visibility uncertainty that would require guessing client behavior.

## Stop Conditions

- Timeline placement/presentation requires product decision.
- Backend contract lacks required fields.
- Auth/visibility behavior would require client-side guessing.

## Expected Report Output

- Profile files changed.
- API hooks/client changes.
- UI states implemented.
- Verification evidence for type-check, tests, and lint.

## Completion Notes

Filled by the execution skill or runner.
