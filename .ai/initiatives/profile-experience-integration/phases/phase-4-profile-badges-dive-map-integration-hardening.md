# Phase 4: Profile Badges + Dive Map Integration Hardening

Status: completed

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

Completed on 2026-05-31.

- Removed the legacy `media_posts.dive_site_id` fallback from Profile Badges visited-site count helpers.
- Profile Badges now counts Dive Sites Visited only through `user_dive_sites`.
- Updated badge contract tests to fail if a transitional media-post fallback returns.
- Updated Dive Sites Visited auto-stat metadata from `transitional_media_posts_until_user_dive_sites` to `user_dive_sites`.
- No new badge product rules or map badges were added.

Verification completed:

- `cd services/fphgo && go test ./internal/features/profiles/...` passed.
- `cd services/fphgo && go test ./internal/features/dive_map/...` passed.
- `pnpm --filter @freediving.ph/types test` passed: 39 tests.
- `rg -n "Transitional fallback|transitional_media_posts_until_user_dive_sites|tagged_sites|userDiveSitesTableExists" services/fphgo/internal/features/profiles` returned only the guard assertion in `badges_contract_test.go`.
- `git diff --check` passed.
