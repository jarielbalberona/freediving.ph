# Phase 3: Visibility/Privacy Integration Audit

Status: completed

## Objective

Ensure owner/public viewer visibility behavior is consistent across Badges, Map, Journey, Passport, and profile UI.

## Goal

Verify module visibility filters and profile viewer behavior across backend contracts and web composition.

## Scope

- Backend visibility tests for Profile Badges, Dive Map, Journey, and Passport.
- Shared DTO visibility field audit.
- Web profile owner/public viewer composition checks.

## Out Of Scope

- No new visibility states without product approval.
- No privacy policy changes.
- No unrelated auth refactors.

## Non-Goals

- Do not weaken visibility rules to simplify integration.
- Do not silently map unsupported visibility values.
- Do not leak private child data through Passport.

## Dependencies

- Phase 1 report.
- Existing auth/viewer relationship helpers.
- Existing module visibility contracts.

## Tasks

- Verify public badges exclude private badges.
- Verify Map marker visibility rules are preserved.
- Verify Journey `public | followers | private` handling or approved fallback.
- Verify Passport applies child visibility.
- Verify owner-only controls do not appear to public viewers.

## Verification Requirements

- Tests must include owner and public viewer cases.
- Visibility failures must hard-stop if product rules are unclear.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/profiles/...`
- `cd services/fphgo && go test ./internal/features/dive_journey/...` if a Journey package exists.
- `cd services/fphgo && go test ./internal/features/dive_passport/...` if a Passport package exists.
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web test`
- `git diff --check`

## Expected Evidence

- Owner/public visibility tests.
- Shared DTO visibility audit.
- Web profile owner/public state evidence.

## Repair Policy

Allowed repairs:

- visibility filter corrections.
- contract tests for visibility fields.
- web guard fixes for owner-only controls.
- formatting issues.

Hard-stop for privacy ambiguity, missing follower/relationship model needed by a module, or contradictory visibility rules.

## Stop Conditions

- Privacy behavior cannot be inferred from existing conventions.
- Child module visibility contracts conflict.
- Public profile would leak private data.

## Expected Report Output

- Visibility matrix.
- Tests run and evidence.
- Remaining privacy risks or product decisions.

## Completion Notes

Completed on 2026-05-31.

- Audited existing owner/public visibility behavior across Profile Badges, Dive Map/profile diving, Dive Journey, Dive Passport, shared DTO tests, and web profile composition.
- Verified public Profile Badges exclude private badges.
- Verified Journey uses `public | followers | private` and follower state from `saved_users`.
- Verified Passport forwards viewer identity to child readers and does not apply its own competing visibility policy.
- Verified web owner controls are gated by `isOwner` from profile viewer relationship.
- No application code changes were required in this phase.

Verification completed:

- `cd services/fphgo && go test ./internal/features/profiles/...` passed.
- `cd services/fphgo && go test ./internal/features/dive_journey/...` passed.
- `cd services/fphgo && go test ./internal/features/dive_passport/...` passed.
- `pnpm --filter @freediving.ph/types test` passed: 39 tests.
- `pnpm --filter @freediving.ph/web test` passed: 209 tests, 195 passed, 14 skipped.
- `git diff --check` passed.

Remaining privacy risk:

- Dive Memories/tagged-user sharing remains deferred. No current module may infer memory visibility or use shared/tagged memory as proof.
