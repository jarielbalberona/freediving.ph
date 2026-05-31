# Phase 6: Web Passport Profile UI

Status: pending

## Objective

Render Passport as a profile showcase surface without implying verification or source ownership.

## Goal

Add the profile Passport section/page/tab using backend aggregate APIs and shared contracts.

## Scope

- `apps/web/src/features/profile`
- Existing profile routes under `apps/web/src/app/profile/[username]` and `apps/web/src/app/[username]` as applicable.
- Existing API client and hook patterns.
- Shared contracts from `@freediving.ph/types`.
- Web tests following existing conventions.

## Out Of Scope

- No backend changes except fixing direct contract mismatches.
- No Dive Map implementation.
- No Dive Journey implementation.
- No badge verification UI.
- No Passport PDF/export.
- No mobile implementation.
- No ranking/reputation scoring.

## Non-Goals

- Do not calculate source stats in the browser.
- Do not imply Passport verifies certifications or badges.
- Do not hide missing child systems behind fake achievements.

## Dependencies

- Phase 5 shared contracts.
- Phase 3 backend aggregate API.
- Phase 4 settings API if implemented.
- Existing profile page/component conventions.
- AGENTS rule to prefer shadcn/ui composition and existing file structure.

## Tasks

- Add API client/hook support for Passport aggregate reads.
- Add profile Passport UI surface with stable empty, loading, error, and populated states.
- Add section rendering for diver summary, map preview, badge showcase, journey highlights, and recent memories/media.
- Add settings UI only if Phase 4 implemented settings.
- Ensure UI does not imply formal verification unless source systems provide verification indicators.
- Add relevant web tests.

## Verification Requirements

- Web type-check is mandatory.
- UI must consume shared contracts.
- Tests or documented static evidence must cover new user and missing child-section empty states.

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
- Empty states work for missing map, journey, badges, memories, and media.
- UI remains a showcase/presentation surface, not a verification surface.

## Repair Policy

Allowed repairs:

- TypeScript compile failures.
- lint failures.
- test failures inside changed web/profile modules.
- contract import/export mismatches.
- formatting issues.

Hard-stop for unresolved UX decision around Passport placement, missing backend contract needed by UI, or auth/visibility uncertainty that would require guessing client behavior.

## Stop Conditions

- Passport placement/tab/section requires product decision.
- Backend contract lacks required display fields.
- Client would need to guess auth, visibility, or source truth.

## Expected Report Output

- Profile files changed.
- API hooks/client changes.
- UI states implemented.
- Verification evidence for type-check, tests, lint, and empty states.

## Completion Notes

Filled by the execution skill or runner.
