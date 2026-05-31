# 12 Instructor Application And Profile Parity

Status: Ready After Previous
Ready for execution: yes
Execution started: no
Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.
PASS criterion: mobile supports instructor application/profile/certification parity without faking verification or bypassing school creation prerequisites.

## Readiness Rationale

This is sequence-gated, not blocked. Instructor application/profile contracts exist; execution must preserve the rule that a user should be an approved instructor before creating their own school, while instructors may belong to multiple schools.

## 1. Purpose

Replace the mobile instructor placeholder with native instructor application and profile flows aligned with web and backend rules.

## 2. Scope

- Instructor application route.
- Instructor profile details.
- Certification list/create/edit/delete if supported.
- Certification proof upload if supported.
- Submit application / save profile semantics.
- Verification status display.
- Public instructor profile if needed by school/course flows.
- Link from school creation only when prerequisites are unmet.

## 3. Explicit Non-Goals

- School management.
- Admin instructor verification/rejection actions.
- Faking approval/verification client-side.
- Full school creation unless covered by school initiatives.

## 4. Dependencies

- `01-auth-onboarding-account-setup.md`
- `10-schools-public-courses-bookings.md` if public instructor profiles are used in school detail.
- `11-school-management-parity.md` only if mobile links directly from school management.

## 5. Files And Areas Likely Involved

- `apps/mobile/app/(app)/(tabs)/(home)/instructor-application.tsx`
- future `apps/mobile/src/features/instructors/**`
- `apps/web/src/app/instructor/**`
- `apps/web/src/app/management/instructor-profile/page.tsx`
- `apps/web/src/app/instructors/[username]/page.tsx`
- `apps/web/src/features/instructors/**`
- `packages/types/src/instructors.ts`
- `services/fphgo/internal/features/instructors/**`
- `services/fphgo/internal/features/schools/**`

## 6. Existing Web Source Of Truth

- `/instructor/apply`
- `/instructor/profile`
- `/instructor/certifications`
- `/management/instructor-profile`
- `/instructors/[username]`
- `InstructorApplicationPage`, `InstructorProfileForm`, `InstructorProfileFormTabs`

## 7. Existing Mobile Implementation Status

Mobile instructor application is a placeholder that tells users to use web.

## 8. Backend/Shared Contract Status

Instructor contracts and backend features exist. Memory notes confirm school creation requires a completed instructor profile with certifications, not merely manual verification status.

## 9. Implementation Steps

1. Add mobile instructor feature module and route.
2. Add query/mutation hooks using shared instructor contracts.
3. Implement profile/details/certification form sections.
4. Add proof upload if existing media context and backend contract are clear.
5. Render verification/application status and allowed actions.
6. Add public instructor profile only if required by school/mobile navigation.
7. Add tests for save, submit, verified-state CTA suppression, and prerequisite messaging.

## 10. Role/Auth/Privacy Rules

Authenticated users may manage their own instructor application/profile. Admin verification remains web/admin only. Public instructor profile must expose only backend-approved public fields.

## 11. UX Rules For Native Mobile

Use segmented sections for details and certifications. Put attestation before action buttons. Avoid long desktop forms without mobile grouping.

## 12. Data/Source-Of-Truth Rules

Instructor verification and school-creation eligibility are backend truth. A user should be an approved instructor before creating their own school, while instructors may belong to multiple schools. Do not enforce this from client guesses; show backend denial/prerequisite state.

## 13. Implementation Guards

- Stop if certification proof ownership rules are unclear.
- Stop if verification status semantics are ambiguous.
- Do not show "Submit application" to already verified users if backend says verified.
- Do not implement admin verification.

## 14. Acceptance Criteria

- Users can create/update instructor profile and certifications on mobile.
- Status and prerequisite messaging match backend/web semantics.
- Verified users do not see inappropriate application CTAs.
- School prerequisite errors link to the right instructor flow.

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

- Open instructor application signed out/signed in.
- Save details.
- Add/edit/remove certification.
- Upload proof if implemented.
- Submit application.
- Verify status messaging for pending/verified/rejected cases.

## 17. Rollback/Risk Notes

Rollback instructor mobile module/routes. Risks are false trust signals and school-creation prerequisite drift.

## 18. Handoff Notes For The Next Initiative

Saved/search/learn can link to instructor profiles if this initiative exposes public instructor routes.
