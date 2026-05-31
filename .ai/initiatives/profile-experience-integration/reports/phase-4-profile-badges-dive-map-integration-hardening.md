# Phase 4 Report: Profile Badges + Dive Map Integration Hardening

Date: 2026-05-31

## Verdict

PASS

## Scope Completed

- Removed the legacy media-post fallback from Profile Badges visited-site count helpers.
- `CountDiveSitesVisitedByUsername` now delegates directly to `countDiveSitesVisitedFromUserDiveSitesByUsername`.
- `CountDiveSitesVisitedByUserID` now delegates directly to `countDiveSitesVisitedFromUserDiveSitesByUserID`.
- Strengthened repository contract tests so a future transitional fallback fails tests.
- Updated the Dive Sites Visited auto-stat contract metadata to `user_dive_sites`.

## Files Changed

- `services/fphgo/internal/features/profiles/repo/repo.go`
- `services/fphgo/internal/features/profiles/repo/badges_contract_test.go`
- `services/fphgo/internal/features/profiles/service/service.go`
- `services/fphgo/internal/features/profiles/service/badges_test.go`
- `.ai/initiatives/profile-experience-integration/phases/phase-4-profile-badges-dive-map-integration-hardening.md`
- `.ai/initiatives/profile-experience-integration/reports/phase-4-profile-badges-dive-map-integration-hardening.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Integration Evidence

- Dive Sites Visited now aligns with `user_dive_sites` only.
- Shared/tagged memories cannot affect badge auto stats through this path.
- Raw media posts no longer serve as a fallback badge count source.
- Badge writes still do not create or mutate `user_dive_sites`.
- No new badge product rule, verification rule, or source module was added.

## Verification

Passed:

- `cd services/fphgo && go test ./internal/features/profiles/...`
- `cd services/fphgo && go test ./internal/features/dive_map/...`
- `pnpm --filter @freediving.ph/types test`
  - Result: 39 tests passed.
- `rg -n "Transitional fallback|transitional_media_posts_until_user_dive_sites|tagged_sites|userDiveSitesTableExists" services/fphgo/internal/features/profiles`
  - Result: only the guard assertion in `services/fphgo/internal/features/profiles/repo/badges_contract_test.go`.
- `git diff --check`

## Risks

- Environments missing migration `0084_user_dive_sites.sql` will now fail badge visited-site reads instead of falling back. That is correct: `user_dive_sites` is the locked proof-based source of truth.

## Next Phase Readiness

Ready for Phase 5: Dive Map + Journey Integration Hardening.
