# Phase 9: Final Polish And Accessibility

Status: passed

## Objective

Polish the Passport UI within the profile surface without expanding product scope or weakening source boundaries.

## Goal

Polish the web Passport presentation for responsive, accessible profile use without expanding product scope.

## Scope

- `apps/web/src/features/profile`
- Shared UI components only where reuse is justified by existing conventions.
- Web tests or static checks for accessible states where available.

## Out Of Scope

- No backend feature expansion.
- No Passport PDF/export.
- No mobile implementation.
- No ranking/reputation scoring.
- No new source-system behavior.
- No major redesign outside the Passport/profile surface.

## Non-Goals

- Do not invent verification indicators.
- Do not redesign unrelated profile surfaces.
- Do not add new Passport product scope.

## Dependencies

- Completed Passport UI from Phase 6.
- Empty-state and integration behavior from Phases 7 and 8.
- Existing frontend design conventions.

## Tasks

- Review Passport UI for responsive layout and text overflow.
- Ensure section headings, empty states, and controls are accessible.
- Ensure verification indicators are sourced and not invented.
- Ensure settings controls, if implemented, are owner-only and clear.
- Add or update relevant web tests where local conventions support them.

## Verification Requirements

- Web type-check, tests, and lint are mandatory for changed web modules.
- Empty and populated states must avoid text overflow and misleading verification signals.
- Accessibility improvements must stay scoped to Passport/profile UI.

## Verification Commands

- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web lint`
- `git diff -- apps/web`
- `git diff --check`

## Expected Evidence

- Web type-check and relevant tests pass.
- UI handles empty and populated states cleanly.
- Accessibility and responsive concerns are addressed within existing test/static-check limits.
- No unrelated redesign or product expansion is included.

## Repair Policy

Allowed repairs:

- TypeScript compile failures.
- lint failures.
- web test failures inside changed profile modules.
- minor accessible markup fixes.
- formatting issues.

Hard-stop for unresolved UX decisions requiring product/design input or changes outside the Passport/profile surface.

## Stop Conditions

- Polish requires product/design decisions.
- Fix requires changes outside Passport/profile scope.
- Verification indicators cannot be sourced.

## Expected Report Output

- UI polish changes.
- Accessibility/responsive evidence.
- Verification evidence for web checks.
- Confirmation no unrelated redesign was included.

## Completion Notes

Completed on 2026-05-31.

- Added accessible section/card structure to the Passport profile surface with stable heading IDs and `aria-labelledby`.
- Marked decorative icons as hidden from assistive technology.
- Added `aria-live` to loading/unavailable shell states.
- Converted Passport settings controls to a fieldset/legend with explicit checkbox IDs and labels.
- Changed settings editing to local draft state with an explicit Save action instead of mutating on every checkbox toggle.
- Added overflow guards for long site, Journey, and badge text.
- Added web static tests for scoped accessible Passport structure.

Verification completed:

- `pnpm --filter @freediving.ph/web type-check` passed.
- `pnpm --filter @freediving.ph/web test` passed: 209 tests, 195 passed, 14 skipped.
- `pnpm --filter @freediving.ph/web lint` passed.
- `git diff -- apps/web` reviewed.
- `git diff --check` passed.
