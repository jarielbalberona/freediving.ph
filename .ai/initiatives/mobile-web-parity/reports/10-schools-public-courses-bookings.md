# 10 Schools Public, Courses, And Bookings Report

Final status: passed

## Summary

Implemented mobile public schools and student booking parity without adding school management. The mobile app now has native routes/screens for school discovery, school profile/course browsing, course detail with sessions, booking request form, payment instructions and receipt upload, My Bookings, student cancellation, and school/course/my-bookings deep-link resolution.

## Files Changed

- `apps/mobile/app/(app)/(tabs)/(home)/_layout.tsx`
- `apps/mobile/app/(app)/(tabs)/(home)/schools.tsx`
- `apps/mobile/app/(app)/(tabs)/(home)/schools/[slug].tsx`
- `apps/mobile/app/(app)/(tabs)/(home)/schools/[slug]/courses/[courseSlug].tsx`
- `apps/mobile/app/(app)/(tabs)/(home)/schools/bookings/index.tsx`
- `apps/mobile/src/features/schools/**`
- `apps/mobile/src/features/shared/links/lib/resolve-fph-link.ts`
- `apps/mobile/src/features/shared/links/__tests__/resolve-fph-link.test.ts`
- `apps/mobile/src/lib/query/query-keys.ts`
- `apps/mobile/test/resolve-fph-link.test.mjs`
- `apps/mobile/test/schools-public-bookings-parity.test.mjs`
- `.ai/initiatives/mobile-web-parity/10-schools-public-courses-bookings.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `docs/mobile-web-parity-assessment.md`

## Verification Summary

Passed:

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`
- `curl -I --max-time 5 http://127.0.0.1:8081/status`
- `xcrun simctl list devices booted`
- iOS Simulator smoke on iPhone 17 Pro Max:
  - schools list route rendered with live backend schools
  - school detail route rendered with live `codex-smoke-school`
  - course detail route rendered with live `codex-free-course`
  - My Bookings route rendered signed-in empty state
- `git diff --check`

Skipped:

- Shared type tests: no shared contracts changed.
- Backend tests: no backend changed.
- Emulator/device tests: not run per initiative rule.

## Repairs Attempted

1. Type-check found `CourseLevel` passed through a `CourseType` label helper. Split level labeling into its own helper. Result: type-check passed.
2. Test assertions still treated `/schools` as unsupported and had over-broad management-action regexes. Updated route expectations and narrowed assertions to management payment endpoints/actions. Result: mobile tests passed.
3. iOS school detail initially showed a React Query undefined-data warning because a detail query could return `undefined`. Changed missing school data to return `null` and used public list data as the detail source to avoid stale optional-auth/public-detail issues. Result: school detail rendered without redbox.

## Unrelated Drift

The worktree contains broader parity changes from prior initiatives. This report classifies them as related prior initiative drift and does not revert them.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

No durable decision update was made.

## Risks And Limitations

- accepted: Public school contracts do not expose a public instructor list, so mobile cannot show instructor profiles without a backend/shared contract addition.
- accepted: Booking receipt upload supports image proof through existing `course_booking_receipt` media context; document/PDF proof remains out of scope.
- active: School management, instructor applications, approvals, payment review, member management, and destructive school actions remain split to later initiatives.
- active: Booking, payment, cancellation, and school/course availability remain backend-canonical. Mobile cache state must never grant booking/payment capability.

## Manual Smoke Checklist

- Browse schools.
- Open `codex-smoke-school`.
- Open `codex-free-course`.
- Submit a preferred-date booking with a signed-in test account.
- Submit a paid booking receipt where the school has an active payment method.
- Open My Bookings.
- Cancel a pending/approved/scheduled booking.

## Next Phase Readiness

Next recommended mobile-web parity initiative: `12-instructor-application-profile-parity.md`, unless product chooses to execute `09-events-organizer-management-parity.md` or `11-school-management-parity.md` earlier for management parity. The canonical safe sequence keeps public/instructor surfaces before management/destructive admin surfaces.
