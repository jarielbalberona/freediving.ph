# 10 Schools Public, Courses, And Bookings

Status: Ready After Previous
Ready for execution: yes
Execution started: no
Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.
PASS criterion: mobile supports public school discovery, course/session detail, booking, payment instructions/proof, my bookings, and cancellation where policy allows.

## Readiness Rationale

This is sequence-gated, not blocked. Web, backend, and shared school/course/booking contracts exist; mobile implementation should proceed after the earlier social/media foundations are complete.

## 1. Purpose

Move mobile schools from placeholder to user-facing parity for browsing and booking, without touching school management.

## 2. Scope

- Schools list.
- School search/filter.
- School detail/profile.
- Instructor list on school.
- Courses list and course detail.
- Sessions/schedules.
- Booking form.
- Payment instructions.
- Payment proof upload if supported.
- Booking status.
- My bookings list/detail.
- Cancel booking if policy allows.
- Booking notifications/deep links.
- Manage button for authorized users only if management initiative exists.

## 3. Explicit Non-Goals

- School management.
- Instructor application except linking to existing flow if needed.
- Bypassing booking/payment policy.

## 4. Dependencies

- `01-auth-onboarding-account-setup.md`
- `03-media-posts-comments-deep-links.md` if payment proof uses media upload.
- Product confirmation that mobile booking is desired for parity.

## 5. Files And Areas Likely Involved

- `apps/mobile/app/(app)/(tabs)/(home)/schools.tsx`
- Future `apps/mobile/src/features/schools/**`
- `apps/web/src/app/schools/**`
- `apps/web/src/app/my/bookings/page.tsx`
- `apps/web/src/features/schools/**`
- `packages/types/src/schools.ts`
- `services/fphgo/internal/features/schools/**`

## 6. Existing Web Source Of Truth

- `/schools`
- `/schools/[slug]`
- `/schools/[slug]/courses`
- `/schools/[slug]/courses/[courseSlug]`
- `/schools/[slug]/courses/[courseSlug]/book`
- `/my/bookings`
- `apps/web/src/features/schools/pages/PublicSchoolsPage.tsx`

## 7. Existing Mobile Implementation Status

Mobile `schools.tsx` is a placeholder that sends users to web.

## 8. Backend/Shared Contract Status

School/course/booking DTOs exist in `packages/types/src/schools.ts`, and web uses `/v1/schools`, course, session, booking, payment, and my-bookings endpoints.

## 9. Implementation Steps

1. Add mobile schools feature module and route screens.
2. Add API hooks using shared school contracts.
3. Implement list/search/filter and school/course detail.
4. Implement booking form and status views.
5. Add payment proof upload if supported by existing media/payment contract.
6. Add my bookings and cancellation where policy allows.

## 10. Role/Auth/Privacy Rules

Public school/course browsing may be guest-visible. Booking/payment/my bookings require auth. Booking policy and payment status come from backend.

## 11. UX Rules For Native Mobile

Use progressive booking steps and clear payment status. Do not copy large desktop school management layouts.

## 12. Data/Source-Of-Truth Rules

School/course/session/booking/payment truth is backend-owned. Mobile local state is draft UI only.

## 13. Implementation Guards

- Stop if booking/payment policy is ambiguous.
- Stop if proof upload ownership context is unclear.
- Do not implement management actions here.

## 14. Acceptance Criteria

- Users can browse schools and courses.
- Authenticated users can book available sessions.
- Users can view booking status and my bookings.
- Cancellation works only when policy allows.

## 15. Verification Commands

- `pnpm --filter @freediving.ph/mobile test`
- `pnpm --filter @freediving.ph/mobile type-check`
- `pnpm --filter @freediving.ph/types test` if contracts change
- Backend tests only if backend changes
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

- Browse schools.
- Open school and course detail.
- Book a course/session.
- Upload payment proof if implemented.
- View and cancel booking if allowed.

## 17. Rollback/Risk Notes

Rollback schools mobile module/routes. Risks are bad bookings, payment confusion, and exposing management-only data.

## 18. Handoff Notes For The Next Initiative

School management remains separate in `11-school-management-parity.md`.
