# 11 School Management Parity

Status: Ready After Previous
Ready for execution: yes
Execution started: no
Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses; implement only role-guarded school owner/admin capabilities backed by existing contracts.

## Readiness Rationale

This is not blocked at the initiative level. The parity goal includes school management, and existing web/backend management behavior can be adapted to native mobile with strict role guards. Execution must hard-stop only on a specific destructive-action, auth, payment, or missing-contract conflict.

## 1. Purpose

Plan mobile school management parity separately from public school booking so operational, payment, course, member, and settings actions get stricter role and destructive-action guards.

## 2. Scope

May include after product approval:

- School owner/admin dashboard.
- School profile/logo/cover editing.
- Courses create/edit/archive.
- Sessions create/edit/cancel/duplicate.
- Bookings list/search/filter.
- Booking status actions.
- Payment proof review/approve/reject.
- Payment methods.
- Members/instructors list.
- Member invite/role/status actions.
- Settings and danger-zone actions only if strongly guarded.

## 3. Explicit Non-Goals

- Public school browsing, course detail, or student booking. Those belong to `10-schools-public-courses-bookings.md`.
- Instructor application/profile parity. That belongs to `12-instructor-application-profile-parity.md`.
- Admin/super-admin moderation.
- Implementation while this initiative remains not ready.

## 4. Dependencies

- `10-schools-public-courses-bookings.md`
- Product decision on mobile school management scope.
- Existing backend school management APIs.

## 5. Files And Areas Likely Involved

- `apps/web/src/app/management/schools/**`
- `apps/web/src/features/schools/pages/ManageSchoolsPage.tsx`
- `apps/web/src/features/schools/api/schools.ts`
- future `apps/mobile/src/features/schools/management/**`
- `apps/mobile/app/(app)/(tabs)/(home)/manage-schools.tsx`
- `packages/types/src/schools.ts`
- `services/fphgo/internal/features/schools/**`

## 6. Existing Web Source Of Truth

- `/management/schools`
- `/management/schools/[slug]`
- `/profile`, `/courses`, `/sessions`, `/bookings`, `/payments`, `/members`, `/settings`
- `apps/web/src/features/schools/pages/ManageSchoolsPage.tsx`

## 7. Existing Mobile Implementation Status

Mobile `manage-schools.tsx` is an authenticated placeholder that sends users to web for school profile, courses, bookings, and payment methods.

## 8. Backend/Shared Contract Status

School management contracts exist in web API usage and `packages/types/src/schools.ts`. Role behavior must be verified against backend responses before mobile exposes actions.

## 9. Implementation Steps

1. Human approves the subset of school management that belongs on mobile.
2. Add a role-gated mobile management route shell.
3. Implement read-only dashboard and school switcher first.
4. Implement approved mutations one module at a time.
5. Add destructive confirmations and backend-error presentation.
6. Add tests for owner/admin/instructor/unauthorized states.

## 10. Role/Auth/Privacy Rules

Only authorized school owners/admins should mutate school management state. Instructors may belong to schools but must not receive owner/admin powers unless backend role allows it.

## 11. UX Rules For Native Mobile

Use task-specific screens and action sheets. Do not copy the desktop management workspace. Prefer short operational flows with clear status chips.

## 12. Data/Source-Of-Truth Rules

School profile, courses, sessions, bookings, payments, members, and roles are backend truth. Mobile local state is only transient form/draft state.

## 13. Implementation Guards

- Hard-stop until product marks the approved mobile management subset.
- Stop if backend role payload cannot distinguish owner/admin/instructor.
- Confirm destructive and payment-impacting actions.
- Do not implement danger-zone actions without explicit approval.

## 14. Acceptance Criteria

- Only approved management modules exist.
- Unauthorized users cannot render or execute management actions.
- Mutations preserve backend role and audit expectations.
- Web and mobile show consistent school management state after actions.

## 15. Verification Commands

- `pnpm --filter @freediving.ph/mobile test`
- `pnpm --filter @freediving.ph/mobile type-check`
- Backend tests if backend changes
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

- Open as signed-out, student, instructor, school admin, and owner.
- Verify route access for each role.
- Exercise each approved mutation.
- Confirm changed state in web management.
- Confirm destructive actions require confirmation.

## 17. Rollback/Risk Notes

Rollback school management mobile routes/modules. Risks are payment mistakes, booking corruption, unauthorized role escalation, and destructive changes from a small-screen UI.

## 18. Handoff Notes For The Next Initiative

Do not execute until Ready for execution is set to yes with an approved management subset.
