# Phase 3 Report: Visibility/Privacy Integration Audit

Date: 2026-05-31

## Verdict

PASS

## Visibility Matrix

| Module | Owner behavior | Public/signed-out behavior | Evidence |
| --- | --- | --- | --- |
| Profile Badges | Owner can read/manage own badges through `GET /v1/me/badges` and badge write routes. | Public profile badges filter `ub.visibility = 'public'`; private badges are excluded. | `services/fphgo/internal/features/profiles/repo/badges_contract_test.go`, `services/fphgo/internal/features/profiles/service/badges_test.go` |
| Dive Map | Owner profile map reads use viewer-aware profile routes and `user_dive_sites`. | Map visibility follows profile map read semantics and only returns unlocked proof rows visible to the viewer. | `services/fphgo/internal/features/profiles/repo/badges_contract_test.go`, `apps/web/test/profile-dive-map-contract.test.mjs` |
| Dive Journey | Owner can see/manage own entries; custom delete UI is owner-only. | Public sees `public`; followers see `public` + `followers`; private remains owner-only. | `services/fphgo/internal/features/dive_journey/repo/repo_integration_test.go`, `apps/web/test/profile-journey-contract.test.mjs` |
| Dive Passport | Owner sees settings controls. | Public reads aggregate through child readers with forwarded viewer identity; settings controls are hidden. | `services/fphgo/internal/features/dive_passport/service/service_test.go`, `apps/web/test/profile-passport-contract.test.mjs` |
| Profile UI | `isOwner` comes from `viewerRelationship.isSelf`. | Public viewers do not receive owner-only controls. | `apps/web/src/features/profile/pages/ProfilePage.tsx`, profile web tests |

## Files Changed

- `.ai/initiatives/profile-experience-integration/phases/phase-3-visibility-privacy-integration-audit.md`
- `.ai/initiatives/profile-experience-integration/reports/phase-3-visibility-privacy-integration-audit.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

No application code changed in this phase.

## Verification

Passed:

- `cd services/fphgo && go test ./internal/features/profiles/...`
- `cd services/fphgo && go test ./internal/features/dive_journey/...`
- `cd services/fphgo && go test ./internal/features/dive_passport/...`
- `pnpm --filter @freediving.ph/types test`
  - Result: 39 tests passed.
- `pnpm --filter @freediving.ph/web test`
  - Result: 209 tests, 195 passed, 14 skipped.
- `git diff --check`

## Remaining Risks

- Dive Memories/tagged-user sharing remains out of scope and unimplemented. Until a separate privacy/tagging initiative exists, shared/tagged memories must stay out of map unlocks, counts, Journey authority, Passport proof, and profile source truth.
- Public profile composition has multiple visibility-aware modules on one page; Phase 7 must verify the final UX does not imply hidden/private data is absent or verified.

## Next Phase Readiness

Ready for Phase 4: Profile Badges + Dive Map Integration Hardening.
