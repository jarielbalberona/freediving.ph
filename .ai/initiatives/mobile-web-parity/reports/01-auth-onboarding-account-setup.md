# 01 Auth, Onboarding, And Account Setup Report

Date: 2026-06-01
Final status: PASS WITH ISSUES

## Summary

Implemented mobile first-run onboarding and account setup parity foundation. Signed-in incomplete users are redirected to `/onboarding`; complete users bypass onboarding. The onboarding screen writes only supported shared profile fields through the existing authenticated profile mutation.

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

## Verification

Passed:

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`

Pending final hygiene:

- `git diff --check`

## iOS Simulator Smoke

Required because this initiative changes mobile auth/navigation/profile setup.

- Command: `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile ios`
- Result: blocked before app build/launch.
- Failure cause: local dependency/toolchain environment.
- Failure excerpt: Expo failed to install CocoaPods with Gem, then Homebrew install failed with `spawn brew ENOENT`.

Runtime verification is not claimed as passed. Static verification passed, so this is `PASS WITH ISSUES` rather than `Blocked`.

## Manual Smoke Checklist

- Launch the app on iOS Simulator after CocoaPods tooling is available.
- Sign in as an incomplete user and confirm `/onboarding` appears before member tabs.
- Complete display name and home area and confirm redirect to Home.
- Relaunch as complete user and confirm no onboarding loop.
- Open Settings and tap Profile setup.
- Sign out and confirm protected member data is not exposed.

## Risks And Limitations

- `accepted`: iOS Simulator smoke is environment-blocked by missing CocoaPods CLI/Homebrew PATH.
- `active`: if production can create a signed-in user without a profile row, the app reports setup load failure; backend provisioning remains canonical and was not changed in this initiative.

## Next

Proceed to `02-profile-core-badges-dive-identity.md`.
