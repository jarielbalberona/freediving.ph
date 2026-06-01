# 01 Auth, Onboarding, And Account Setup

Status: PASS WITH ISSUES
Ready for execution: yes
Execution started: yes
PASS criterion: authenticated new users can complete required mobile profile setup; complete users bypass onboarding; account basics remain policy-aligned.

## Readiness Rationale

This is the current execution target. `00-mobile-web-parity-assessment-lock.md` is complete, and no hard product, backend, auth, or privacy blocker is documented for minimum mobile onboarding/account setup.

## 1. Purpose

Close the first-run mobile gap so mobile users can sign in, complete minimum account/profile setup, and land in the app without needing web.

## 2. Scope

- Mobile onboarding route/screen if absent.
- Required profile setup fields supported by backend.
- Username/display-name validation using shared/backend rules.
- Auth-gated redirects and existing-user bypass.
- Account settings basics needed for session/logout/profile setup.
- Notification/session setup only where it is foundational to account setup.

## 3. Explicit Non-Goals

- Full profile parity.
- Badges, Dive Map, Journey, Passport, Memories.
- Buddy relationships, schools, events, groups, admin.
- Backend changes unless a real contract gap blocks mobile onboarding.

## 4. Dependencies

- `00-mobile-web-parity-assessment-lock.md`
- Existing Clerk mobile auth.
- Backend current-user/profile routes.

## 5. Files And Areas Likely Involved

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/index.tsx`
- `apps/mobile/app/sign-in.tsx`
- `apps/mobile/app/sign-up.tsx`
- `apps/mobile/app/(app)/_layout.tsx`
- `apps/mobile/src/features/auth/**`
- `apps/mobile/src/features/profiles/**`
- `apps/mobile/src/lib/auth/**`
- `apps/mobile/src/lib/query/**`
- `packages/types/src/api/me.ts`
- `packages/types/src/api/profile.ts`
- `services/fphgo/internal/features/profiles/**`
- `services/fphgo/internal/features/auth/**`

## 6. Existing Web Source Of Truth

- `apps/web/src/app/onboarding/page.tsx`
- `apps/web/src/app/profile/page.tsx`
- `apps/web/src/app/profile/settings/page.tsx`
- `apps/web/src/app/sign-in/**`
- `apps/web/src/app/sign-up/**`
- `apps/web/src/features/profiles/**`

## 7. Existing Mobile Implementation Status

Mobile has sign-in/sign-up and current/public profile screens. No mobile onboarding route was found in the assessment.

## 8. Backend/Shared Contract Status

Profile/current-user contracts exist. Use shared DTOs from `packages/types`; do not create mobile-local copies.

## 9. Implementation Steps

1. Inspect current mobile auth routing and profile query behavior.
2. Define the minimum backend-backed completion check.
3. Add an onboarding route/screen only for incomplete authenticated users.
4. Reuse profile mutation hooks for required fields.
5. Add bypass logic for complete users.
6. Add focused tests for redirect/completion behavior where possible.

## 10. Role/Auth/Privacy Rules

Only authenticated users can submit onboarding. Existing profile privacy and username ownership rules remain backend-enforced.

## 11. UX Rules For Native Mobile

Use a short native setup flow. Avoid web-style long forms and avoid blocking users on non-required fields.

## 12. Data/Source-Of-Truth Rules

Profile completion is derived from backend profile/current-user state, not local cache alone.

## 13. Implementation Guards

- Hard-stop if backend has no reliable completion signal and product must define required fields.
- Hard-stop if username rules are ambiguous.
- Preserve auth token handling in the shared mobile fphgo client.

## 14. Acceptance Criteria

- New authenticated incomplete users route to onboarding.
- Complete authenticated users bypass onboarding.
- Signed-out users still route to sign-in where required.
- Required field validation is deterministic.
- Logout/account settings still work.

## 15. Verification Commands

- `pnpm --filter @freediving.ph/mobile test`
- `pnpm --filter @freediving.ph/mobile type-check`
- `pnpm --filter @freediving.ph/types test` if contracts change
- `git diff --check`

### iOS Simulator Smoke Test

Required when this initiative changes mobile UI/navigation/runtime behavior.

Suggested flow:
1. Launch the mobile app in an iOS Simulator using the repo-supported command.
2. Confirm the app opens without redbox/runtime crash.
3. Navigate to each screen changed by this initiative.
4. Confirm loading, empty, error, and success states where practical.
5. Confirm primary actions open the expected sheet/screen/form.
6. Confirm back navigation works.
7. Confirm there are no obvious layout breaks on a standard iPhone simulator.
8. Record simulator/device, command used, result, and any runtime errors.

If simulator testing cannot be run, document the blocker and include a manual checklist.

## 16. Manual Smoke Checklist

- Sign in as new user; confirm onboarding appears.
- Complete required fields; confirm app redirects to home/profile.
- Relaunch as complete user; confirm no onboarding loop.
- Sign out; confirm protected tabs do not expose member data.

## 17. Rollback/Risk Notes

Rollback by removing the onboarding route and auth redirect changes. Main risks are auth loops and incomplete users being stranded.

## 18. Handoff Notes For The Next Initiative

After onboarding is stable, `02-profile-core-badges-dive-identity.md` can safely rely on profile identity data being present.

## Implementation Summary

Implemented mobile onboarding/account foundation for first-run authenticated users:

- Added `/onboarding` mobile route and native onboarding screen.
- Added backend-profile-derived completion utility using `displayName` plus `homeArea`/`location`.
- Added signed-in app-shell guard so incomplete users are redirected to onboarding and complete users bypass it.
- Reused existing `PATCH /v1/me/profile` mobile mutation for `displayName`, `homeArea`, `location`, `interests`, and `certLevel`.
- Added account settings entry point back to profile setup while preserving sign out.
- Added targeted mobile tests for route wiring, completion rules, supported payload fields, and settings access.
- Updated `docs/mobile-web-parity-assessment.md` to reflect onboarding is no longer missing.

## Files Changed

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/(app)/_layout.tsx`
- `apps/mobile/app/onboarding.tsx`
- `apps/mobile/src/features/onboarding/screens/onboarding-screen.tsx`
- `apps/mobile/src/features/auth/screens/settings-screen.tsx`
- `apps/mobile/src/features/profiles/lib/profile-completion.ts`
- `apps/mobile/test/auth-onboarding-parity.test.mjs`
- `docs/mobile-web-parity-assessment.md`
- `.ai/initiatives/mobile-web-parity/01-auth-onboarding-account-setup.md`
- `.ai/state/current-state.md`

## Static Checks Run

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test`: passed, 28/28 tests.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`: passed.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`: passed.
- `git diff --check`: pending final run for this initiative.

Initial attempts with `pnpm` failed because `pnpm` is not on the default shell PATH in this Codex session. The working command path is `/opt/homebrew/bin/pnpm`.

## iOS Simulator Smoke Result

- Command: `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile ios`
- Result: blocked by local environment/toolchain.
- Failure classification: dependency/toolchain and environment, not app code.
- Exact failure: Expo attempted to install CocoaPods, `gem install cocoapods --no-document` exited non-zero, then Homebrew install failed with `spawn brew ENOENT`.
- Static verification still passed.

Because the iOS Simulator command did not reach app build/launch, runtime smoke is not claimed as passed. This initiative is `PASS WITH ISSUES` until CocoaPods/brew tooling is available and manual simulator smoke confirms there is no onboarding/auth loop.

## Remaining Gaps

- Runtime iOS Simulator smoke remains manual/environment-blocked.
- Username editing is not implemented because `UpdateMyProfileRequest` does not expose username mutation. Existing username ownership/rules remain backend-owned.
- Backend profile creation for truly missing profile rows was not changed. If a newly authenticated user can hit `GET /v1/me/profile` 404 in production, that is a backend provisioning issue for a later focused fix.

## Manual Smoke Checklist

- Launch the app on iOS Simulator after CocoaPods tooling is installed.
- Sign in as an incomplete user; confirm `/onboarding` appears before member tabs.
- Submit display name and home area; confirm redirect to Home.
- Relaunch as the same complete user; confirm no onboarding loop.
- Open Settings, tap Profile setup, confirm complete users are redirected back to Home.
- Sign out; confirm protected member data is not exposed.

## Risks

- `accepted`: iOS runtime smoke is environment-blocked in this session by missing CocoaPods CLI/Homebrew PATH.
- `active`: backend behavior for a signed-in user with no profile row was not changed; the current mobile screen reports setup load failure instead of creating a profile client-side.

## Next Initiative

Proceed to `02-profile-core-badges-dive-identity.md` because `01` static checks passed and the iOS failure is an environment/toolchain blocker, not a code-caused runtime failure.
