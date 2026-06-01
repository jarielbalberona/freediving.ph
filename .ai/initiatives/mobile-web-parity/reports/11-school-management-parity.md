# 11 School Management Parity Report

Final status: PASS
Date: 2026-06-01

## Summary

Mobile school management is no longer a placeholder. It now exposes a native management workspace at `manage-schools`, backed by existing `/v1/management/schools` contracts and protected by the existing `MobileAuthRequired` shell plus backend school role enforcement.

The implemented subset is intentionally operational: managed-school switcher, dashboard counts, bookings search/filter/status actions, payment proof review, session completion/cancellation, and read-only courses, members, and payment methods. Full profile editing, course/session authoring, member mutations, payment method mutations, and destructive school/course/session deletion are left on web because those actions are higher risk and need tighter mobile product requirements.

## Files Changed

- `apps/mobile/app/(app)/(tabs)/(home)/manage-schools.tsx`
- `apps/mobile/src/features/schools/api/school-management-api.ts`
- `apps/mobile/src/features/schools/api/schools-api.ts`
- `apps/mobile/src/features/schools/hooks/use-school-management.ts`
- `apps/mobile/src/features/schools/screens/school-management-screen.tsx`
- `apps/mobile/src/features/shared/links/lib/resolve-fph-link.ts`
- `apps/mobile/src/features/shared/links/__tests__/resolve-fph-link.test.ts`
- `apps/mobile/src/lib/query/query-keys.ts`
- `apps/mobile/test/resolve-fph-link.test.mjs`
- `apps/mobile/test/school-management-parity.test.mjs`

## Verification

Passed:

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test -- school-management-parity.test.mjs resolve-fph-link.test.mjs schools-public-bookings-parity.test.mjs`
  - Result: pass, 67 mobile tests.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`
  - Result: pass.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`
  - Result: pass, Biome checked 254 files.
- `git diff --check`
  - Result: pass.
- iOS Simulator smoke:
  - Device: iPhone 17 Pro Max, iOS 26.4.
  - Initial command: `xcrun simctl openurl booted 'freediving-ph-app://management/schools'`.
  - Initial result: Expo Router unmatched route. This proved raw custom-scheme paths do not pass through the in-app URL resolver.
  - Working command: `xcrun simctl openurl booted 'freediving-ph-app://manage-schools'`.
  - Working result: pass. The native Manage Schools screen rendered a live owner school list and selected-school workspace without redbox/runtime crash.
  - Screenshot: `/tmp/fph-ios-school-management-11-route.png`.

Skipped:

- Real approve/reject/complete/cancel/payment-review/session mutations were not submitted during automated smoke because they alter school operations data. Use seeded throwaway bookings, payments, and sessions for manual mutation proof.
- Backend tests were not run because no backend code changed.
- Shared type tests were not run because no shared contracts changed.

## Implementation Notes

- School management API calls were split into `school-management-api.ts` so public/student booking APIs remain cleanly separated.
- Owner/admin actions are hidden unless `school.currentUserRole` is `owner` or `admin`. Instructors retain read-only operational visibility.
- Backend remains authoritative for role enforcement, booking transitions, payment review, session transitions, and payment proof URL authorization.
- Reject booking, cancel booking, reject payment, and cancel session use native confirmation dialogs.
- `/management/schools` and `/schools/[slug]/manage` are resolved by the app's internal link resolver to `manage-schools`, but raw `freediving-ph-app://management/schools` is not an Expo Router route.

## Risks And Limitations

- accepted: Full desktop school profile/course/session/member/payment-method editing remains web-owned for now.
- accepted: Automated smoke did not execute dirtying school management mutations. Manual QA should use throwaway seeded records.
- active: School roles, booking state, payment state, and session state remain backend-canonical. Mobile cache must not be treated as operational truth.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Decisions

No durable product decision was added. The implemented subset follows the latest user-approved scope and existing backend/web management contracts.

## Next Initiative Readiness

`15-admin-moderation-mobile-triage.md` is ready to execute next. Keep it triage-first and avoid destructive moderation actions unless the backend policy and audit trail are unambiguous.
