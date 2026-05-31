# Phase 7: Public Profile UX Composition Audit

Status: pending

## Objective

Make the public profile composition coherent for badges, map, journey, and passport without redundant or contradictory sections.

## Goal

Define and verify owner/public viewer profile presentation across the four modules.

## Scope

- `apps/web/src/features/profile`.
- Public profile routes.
- Profile module tabs/sections/components.
- Web tests for composition, empty states, and owner/public controls.

## Out Of Scope

- No backend feature expansion.
- No full redesign outside profile surfaces.
- No mobile implementation.
- No Passport export.

## Non-Goals

- Do not hide source modules behind Passport if product conventions require standalone access.
- Do not duplicate the same content in multiple sections without intent.
- Do not make owner-only controls visible publicly.

## Dependencies

- Phase 1 report.
- Completed or planned UI surfaces for Map, Journey, Passport, and Badges.
- Existing profile design conventions.

## Tasks

- Audit current profile sections/tabs.
- Decide whether Passport is a profile tab, section, or standalone route based on existing conventions.
- Define how standalone Badges/Map/Journey sections coexist with Passport.
- Verify owner vs public viewer controls.
- Verify empty states across modules.
- Add web tests where local conventions support them.

## Verification Requirements

- Web type-check required for changed web files.
- Tests or documented static evidence must cover owner/public viewer differences.
- UX decision must be documented or hard-stop.

## Verification Commands

- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web lint`
- `git diff -- apps/web`
- `git diff --check`

## Expected Evidence

- Profile composition map.
- Passport placement decision.
- Owner/public control evidence.
- Empty-state evidence.

## Repair Policy

Allowed repairs:

- scoped profile composition fixes.
- owner/public control guard fixes.
- test updates for profile composition.
- formatting issues.

Hard-stop if Passport placement or section redundancy requires product/UX decision not present in existing conventions.

## Stop Conditions

- Passport placement is ambiguous.
- Standalone module sections conflict with Passport summary.
- UI changes would require redesign outside profile scope.

## Expected Report Output

- Profile UX composition decision.
- Files changed.
- Web verification evidence.
- Remaining UX/product questions.

## Completion Notes

Filled by the execution skill or runner.
