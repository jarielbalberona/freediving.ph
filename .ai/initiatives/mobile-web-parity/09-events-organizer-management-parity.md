# 09 Events Organizer Management Parity

Status: Ready After Previous
Ready for execution: yes
Execution started: no
Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses; implement only role-guarded organizer capabilities backed by existing contracts.

## Readiness Rationale

This is not blocked at the initiative level. The parity goal includes management surfaces, and mobile can implement a strict, native, role-guarded organizer surface from existing backend/web behavior. If execution finds a destructive action, audit requirement, or missing contract with no safe fallback, hard-stop inside the initiative instead of blocking the whole sequence upfront.

## 1. Purpose

Plan mobile event organizer management with strict guards, without assuming every web management panel should exist on phones.

## 2. Scope

May include after product approval:

- Organizer dashboard.
- Event setup/details/logo/cover.
- Participants list/search/filter.
- Participant approve/reject/status changes.
- Check-in scanner/search.
- Payment proof review/approve/reject.
- Join form configuration if practical.
- Organizer posts/updates.
- Program management.
- Sponsors management.
- Awards/prizes management.
- Event settings/danger zone only if strongly guarded.

## 3. Explicit Non-Goals

- Implementation while status is not ready.
- Admin/moderation unrelated to event organizing.
- Weakening backend/web role logic.
- Emulators/device tests.

## 4. Dependencies

- `08-events-attendee-parity.md`
- Product decision on organizer mobile scope.
- Existing backend organizer APIs.

## 5. Files And Areas Likely Involved

- `apps/web/src/app/management/events/**`
- `apps/web/src/app/events/[slug]/client-page.tsx`
- `apps/web/src/features/events/**`
- Future `apps/mobile/src/features/events/management/**`
- `packages/types/src/index.ts`
- `services/fphgo/internal/features/events/**`

## 6. Existing Web Source Of Truth

- `/management/events`
- `/management/events/[slug]/setup`
- `/participants`, `/check-in`, `/payments`, `/posts`, `/program`, `/settings`, `/sponsors`, `/awards`, `/join-form`
- Legacy redirects under `/events/[slug]/manage*`.

## 7. Existing Mobile Implementation Status

No mobile organizer management equivalent was found.

## 8. Backend/Shared Contract Status

Web event API exposes management endpoints for modules, join forms, program, payments, competitions, prizes, sponsors, posts, participant role/status, approvals, and check-in.

## 9. Implementation Steps

1. Human defines approved mobile organizer subset.
2. Add role-gated management route shell.
3. Implement only approved modules, starting with participants/check-in if field use is the reason.
4. Add destructive action confirmations.
5. Add tests for unauthorized, organizer, and admin states.

## 10. Role/Auth/Privacy Rules

Confirm organizer/admin role before rendering actions. Backend must reject unauthorized calls. Do not expose management routes to unauthorized users.

## 11. UX Rules For Native Mobile

Use task-focused screens, not desktop dashboard parity. Field workflows such as check-in should be optimized first if approved.

## 12. Data/Source-Of-Truth Rules

Event management state, auditability, payments, check-ins, and participant statuses are backend truth.

## 13. Implementation Guards

- Hard-stop until product marks scope ready.
- Confirm destructive actions.
- Preserve audit/security expectations.
- Stop if backend role response is insufficient for client gating.

## 14. Acceptance Criteria

- Only approved organizer modules exist on mobile.
- Unauthorized users cannot render or execute management actions.
- Destructive actions require confirmation.
- Backend remains canonical for all state.

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

- Open as non-participant, attendee, organizer, and admin.
- Attempt each management action.
- Verify destructive confirmations.
- Verify check-in/payment/participant updates in web after mobile action.

## 17. Rollback/Risk Notes

Rollback event management mobile routes. Risk is high: unauthorized management, payment mistakes, check-in corruption, and destructive action errors.

## 18. Handoff Notes For The Next Initiative

Do not execute until product changes Ready for execution to yes and lists approved modules.
