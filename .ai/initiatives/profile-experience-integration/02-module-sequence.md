# Profile Experience Integration Module Sequence

## Dependency Order

1. Discovery and integration contract audit.
2. Source-of-truth and data-flow verification.
3. Visibility/privacy integration audit.
4. Profile Badges + Dive Map integration hardening.
5. Dive Map + Journey integration hardening.
6. Journey + Passport integration hardening.
7. Public profile UX composition audit.
8. API/DTO consistency and shared contracts audit.
9. Gap report and follow-up initiative recommendations.
10. Final verification/reporting.

## Phase 1: Discovery And Integration Contract Audit

Goal: inspect locked initiatives, Profile Badges implementation, current profile APIs, and web profile composition before changes.

Primary modules:

- `.ai/initiatives/user-dive-map`
- `.ai/initiatives/dive-journey`
- `.ai/initiatives/dive-passport`
- `services/fphgo/internal/features/profiles`
- `packages/types/src/api/badges.ts`
- `packages/types/src/api/profile.ts`
- `packages/types/src/api/profile-view.ts`
- `apps/web/src/features/profile`

## Phase 2: Source-Of-Truth And Data-Flow Verification

Goal: prove or repair one-way source ownership across Badges, Map, Journey, and Passport.

Primary modules:

- Backend services/repositories for profiles/badges, Dive Map, Journey, Passport.
- Cross-module service tests.
- Initiative reports documenting data ownership.

## Phase 3: Visibility/Privacy Integration Audit

Goal: verify consistent owner/public viewer visibility behavior across all profile experience modules.

Primary modules:

- Backend service/handler tests for profile badges, map, journey, passport.
- Shared DTOs representing visibility.
- Web profile composition tests.

## Phase 4: Profile Badges + Dive Map Integration Hardening

Goal: ensure Dive Sites Visited and future map badges source from `user_dive_sites`.

Primary modules:

- `services/fphgo/internal/features/profiles/service`
- `services/fphgo/internal/features/profiles/repo`
- Dive Map read model package if implemented.
- `packages/types/src/api/badges.ts`

## Phase 5: Dive Map + Journey Integration Hardening

Goal: ensure map milestones can feed Journey while Journey never creates map ownership.

Primary modules:

- Dive Map service/repository.
- Dive Journey service/repository.
- Generated-entry idempotency tests.

## Phase 6: Journey + Passport Integration Hardening

Goal: ensure Passport can read Journey highlights without mutating Journey or using Journey as source stats.

Primary modules:

- Dive Journey read services/contracts.
- Dive Passport aggregate service/contracts.
- Web Passport/profile UI if implemented.

## Phase 7: Public Profile UX Composition Audit

Goal: define and verify coherent owner/public profile composition for badges, map, journey, and passport.

Primary modules:

- `apps/web/src/features/profile`
- `apps/web/src/app/profile/[username]`
- `apps/web/src/app/[username]` if profile route conventions use it.

## Phase 8: API/DTO Consistency And Shared Contracts Audit

Goal: make shared contracts consistent across modules and prevent feature-local cross-boundary DTO drift.

Primary modules:

- `packages/types/src/api`
- `packages/types/test`
- Backend handler DTOs for profile badges, map, journey, passport.

## Phase 9: Gap Report And Follow-Up Initiative Recommendations

Goal: produce a brutally clear report of unresolved integration gaps and recommend follow-up initiatives only where needed.

Primary modules:

- `.ai/initiatives/profile-experience-integration/reports`
- `.ai/state/known-risks.md`
- `.ai/state/current-state.md`

## Phase 10: Final Verification/Reporting

Goal: run final targeted and repo-level verification, write reports, and update state accurately when execution actually happens.

Primary modules:

- `.ai/initiatives/profile-experience-integration/reports`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- Git diff review.
