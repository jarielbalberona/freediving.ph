# Phase 7: Empty-State And Visibility Hardening

Status: passed

## Objective

Prove the aggregate handles missing/private child data without leaks, fake stats, or source-system mutations.

## Goal

Prove Passport handles missing, empty, or private child systems without leaking data or inventing source truth.

## Scope

- Passport aggregate service tests.
- Passport handler tests.
- Shared type tests for fallback states.
- Web tests for empty/private child sections where applicable.
- Targeted fixes only where tests expose violations.

## Out Of Scope

- No new product features.
- No new visibility states without product approval.
- No source-system implementation.
- No broad refactors unrelated to Passport visibility and fallback behavior.

## Non-Goals

- Do not weaken source visibility rules.
- Do not synthesize fake data for nicer empty states.
- Do not alter source systems to satisfy Passport.

## Dependencies

- Completed Phases 3 through 6.
- Phase 1 visibility findings.
- Existing auth/visibility test helpers.

## Tasks

- Add or strengthen tests for private child resource filtering.
- Add or strengthen tests for missing Dive Map fallback.
- Add or strengthen tests for missing Dive Journey fallback.
- Add or strengthen tests for missing badges fallback.
- Add or strengthen tests proving Passport does not synthesize fake stats or achievements.
- Fix only code paths that violate these rules.

## Verification Requirements

- Tests must cover missing Dive Map, empty Journey, no badges, no memories/media, private child data, and new user profile.
- Tests must prove no source-system writes occur.
- Web tests must cover relevant empty states where feasible.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_passport/...` if a Passport package exists.
- `cd services/fphgo && go test ./internal/features/profiles/...` if profile paths are touched.
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web test`
- `git diff --check`

## Expected Evidence

- Tests prove visibility enforcement.
- Tests prove safe fallback/empty states.
- Tests prove no Passport-owned source data or fake stats.
- Phase report names any remaining visibility risk.

## Repair Policy

Allowed repairs:

- service logic corrections inside Passport/profile scope.
- repository/read query corrections.
- contract test corrections.
- web rendering guard fixes.
- formatting issues.

Hard-stop if child visibility rules conflict, require new product states, or cannot be enforced without changing source-system behavior.

## Stop Conditions

- Child visibility rules conflict.
- New visibility states are required.
- Empty-state contract is insufficient.
- Enforcement would require changing child source behavior.

## Expected Report Output

- Visibility tests added or strengthened.
- Empty-state tests added or strengthened.
- Remaining visibility risks.
- Evidence no fake stats/source data are produced.

## Completion Notes

Completed on 2026-05-31.

- Strengthened Passport service tests for new-user empty states, unavailable children, viewer identity forwarding, presentation-only settings behavior, and absence of source mutation dependencies.
- Strengthened Passport HTTP tests to prove anonymous and signed-in public aggregate reads pass the correct viewer identity.
- Strengthened shared TypeScript contract tests for empty/unavailable child sections and presentation-only settings.
- Strengthened web tests for empty states, forbidden source-truth claims, and presentation-only settings UI.
- Repaired one overly broad web static assertion during verification; the assertion now scopes to the settings panel instead of incorrectly banning legitimate aggregate stat display.

Verification completed:

- `cd services/fphgo && go test ./internal/features/dive_passport/...` passed.
- `cd services/fphgo && go test ./internal/features/profiles/...` passed.
- `pnpm --filter @freediving.ph/types test` passed: 39 tests.
- `pnpm --filter @freediving.ph/web test` passed: 208 tests, 194 passed, 14 skipped.
- `git diff --check` passed.
