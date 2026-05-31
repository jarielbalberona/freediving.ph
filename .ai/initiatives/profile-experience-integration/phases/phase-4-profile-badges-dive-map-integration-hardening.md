# Phase 4: Profile Badges + Dive Map Integration Hardening

Status: pending

## Objective

Ensure Profile Badges consume Dive Map proof correctly and do not create competing dive-site truth.

## Goal

Align Dive Sites Visited auto stat and future map-based badge origins with `user_dive_sites`.

## Scope

- `services/fphgo/internal/features/profiles/service`.
- `services/fphgo/internal/features/profiles/repo`.
- Badge contract tests.
- Dive Map read model integration if implemented.
- Shared badge source contracts.

## Out Of Scope

- No new badge product rules.
- No new map badges unless already defined.
- No Dive Map implementation beyond read-model integration/hardening.
- No Journey or Passport work.

## Non-Goals

- Do not count memories, Journey entries, Passport state, reviews, saves, likes, or shared/tagged content as visited-site proof.
- Do not make badges write to `user_dive_sites`.

## Dependencies

- Phase 1 and Phase 2 reports.
- Existing Profile Badges service contracts.
- `user_dive_sites` if implemented.

## Tasks

- Verify `dive-sites-visited` auto stat source.
- Replace transitional fallback with `user_dive_sites` only if Dive Map is implemented and phase scope allows.
- Verify `BadgeSourceModule` and `UserBadgeSourceType` support `dive_map`.
- Add tests proving map-based badge sources do not use memories.
- Add tests proving badge writes do not create map ownership.

## Verification Requirements

- Tests must prove Dive Sites Visited aligns with `user_dive_sites`.
- Tests must prove shared/tagged memories do not affect badge auto stats.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/profiles/...`
- `cd services/fphgo && go test ./internal/features/dive_map/...` if a Dive Map package exists.
- `pnpm --filter @freediving.ph/types test`
- `git diff --check`

## Expected Evidence

- Badge + Dive Map integration tests.
- Source type contract evidence.
- Report on transitional fallback removal or remaining blocker.

## Repair Policy

Allowed repairs:

- badge auto-stat source corrections.
- badge source contract tests.
- narrow read integration fixes.
- formatting issues.

Hard-stop if `user_dive_sites` is unavailable and no approved fallback exists, or if correcting stats requires destructive migration/product change.

## Stop Conditions

- Dive Map read model missing with no safe fallback.
- Auto stat cannot be aligned without product decision.
- Current badge behavior conflicts with locked Map spec.

## Expected Report Output

- Dive Sites Visited source evidence.
- Map badge source evidence.
- Any remaining badge/map gap.

## Completion Notes

Filled by the execution skill or runner.
