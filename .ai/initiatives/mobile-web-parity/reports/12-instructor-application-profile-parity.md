# 12 Instructor Application And Profile Parity Report

Final status: passed

## Summary

Replaced the mobile instructor placeholder with backend-contract instructor application/profile support. Mobile now exposes authenticated instructor profile editing, verification status, structured-location prerequisite messaging, certification list/create/edit/delete, certification image proof upload, application submission with attestation, and a public instructor profile route. Admin verification/rejection/suspension actions were deliberately not implemented.

## Files Changed

- `apps/mobile/app/(app)/(tabs)/(home)/_layout.tsx`
- `apps/mobile/app/(app)/(tabs)/(home)/instructor-application.tsx`
- `apps/mobile/app/(app)/(tabs)/(home)/instructors/[username].tsx`
- `apps/mobile/src/features/instructors/**`
- `apps/mobile/src/features/shared/links/lib/resolve-fph-link.ts`
- `apps/mobile/src/features/shared/links/__tests__/resolve-fph-link.test.ts`
- `apps/mobile/src/lib/query/query-keys.ts`
- `apps/mobile/test/instructor-application-parity.test.mjs`
- `apps/mobile/test/resolve-fph-link.test.mjs`
- `.ai/initiatives/mobile-web-parity/12-instructor-application-profile-parity.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `docs/mobile-web-parity-assessment.md`

## Verification Summary

Passed:

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`
- iOS Simulator smoke on iPhone 17 Pro Max:
  - instructor application route rendered signed-in verified state and form
  - public instructor route rendered clean backend not-found state for missing `jariel`
- `git diff --check`

Skipped:

- Shared type tests: no shared contracts changed.
- Backend tests: no backend changed.
- Emulator/device tests: not run per initiative rule.

## Repairs Attempted

No repair loop was needed after implementation. Type-check, tests, and lint passed on the first full 12 run.

## Unrelated Drift

The worktree contains earlier mobile-web parity changes from prior initiatives. This report treats them as related prior initiative drift and does not revert them.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

No durable decision update was made.

## Risks And Limitations

- accepted: Mobile exposes raw structured location code fields because the backend requires at least one structured code before submission and mobile has no shared native PSGC/location picker in this scope.
- accepted: Certification proof upload supports image proof through existing `instructor_certification_proof`; document/PDF proof remains out of scope.
- active: Instructor verification, rejection, suspension, and admin proof review remain web/admin-only.
- active: School creation eligibility remains backend-canonical. Mobile only displays backend status and denial/prerequisite messages.

## Manual Smoke Checklist

- Open instructor application signed out and signed in.
- Save instructor profile details.
- Add certification using official URL only.
- Add/edit certification with image proof.
- Remove certification where backend allows it.
- Submit application with attestation and structured location code.
- Confirm verified/pending users do not see inappropriate submit CTA.
- Open a real public instructor route once seeded data is available.

## Next Phase Readiness

Next recommended mobile-web parity initiative: `13-saved-search-learn-guides.md`.
