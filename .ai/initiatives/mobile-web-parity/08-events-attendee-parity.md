# 08 Events Attendee Parity

Status: Ready After Previous
Ready for execution: yes
Execution started: no
Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.
PASS criterion: mobile supports attendee-facing event discovery, detail, joining, passes if needed, posts/updates, and payment-proof flows where contracts exist.

## Readiness Rationale

This is sequence-gated, not blocked. Attendee-facing event contracts and mobile foundations exist; organizer management remains a later initiative and must not leak into this phase.

## 1. Purpose

Separate attendee mobile parity from organizer management so event users can participate without dragging operational complexity into the first event phase.

## 2. Scope

- Event list/search/filter.
- Event detail improvements.
- Join/leave/interest.
- Attendee pass view if user-facing.
- Join form response if required.
- Payment instructions/proof upload if supported.
- Event posts/updates and reactions.
- Event deep links and notification routing.
- Event create only if confirmed as attendee/community creator scope.

## 3. Explicit Non-Goals

- Organizer dashboard.
- Participant approval/rejection/status changes.
- Payment proof review.
- Program/sponsors/awards/prizes management.
- Admin/moderation.

## 4. Dependencies

- `01-auth-onboarding-account-setup.md`
- `03-media-posts-comments-deep-links.md` if proof upload/media display is needed.
- `16-navigation-deep-linking-platform-hardening.md` for final deep-link release gates.

## 5. Files And Areas Likely Involved

- `apps/mobile/src/features/events/**`
- `apps/mobile/app/(app)/(tabs)/(home)/events*.tsx`
- `apps/web/src/app/events/**`
- `apps/web/src/features/events/**`
- `packages/types/src/index.ts`
- `services/fphgo/internal/features/events/**`

## 6. Existing Web Source Of Truth

- `apps/web/src/app/events/page.tsx`
- `apps/web/src/app/events/[slug]/page.tsx`
- `apps/web/src/app/events/create/page.tsx`
- `apps/web/src/app/events/[slug]/pass/[token]/page.tsx`
- `apps/web/src/features/events/api/events.ts`

## 7. Existing Mobile Implementation Status

Mobile has events list/detail, join/leave, interest, event posts, update creation, and fish reactions. It lacks create event, pass, join form, payment proof, and richer filters.

## 8. Backend/Shared Contract Status

Event contracts cover attendee, post, payment, pass, participant, and management domains. This phase must consume only attendee-safe routes.

## 9. Implementation Steps

1. Add event list filters/search and state polish.
2. Improve detail sections and participant-safe state.
3. Add attendee pass route if product confirms use.
4. Add join form/payment proof only if backend already supports user-facing payloads.
5. Harden event update/reaction behavior.
6. Add route/deep-link tests.

## 10. Role/Auth/Privacy Rules

Guests see public events only. Auth is required for joining, interest, payment proof, posts, and attendee state. Private/member event visibility stays backend-enforced.

## 11. UX Rules For Native Mobile

Attendee flows should be short and status-driven. Do not expose management tabs to ordinary attendees.

## 12. Data/Source-Of-Truth Rules

Event participation, payment, pass, and visibility state are server truth.

## 13. Implementation Guards

- Stop if pass/check-in behavior is not product-confirmed for mobile.
- Stop if payment proof upload policy is unclear.
- Do not add organizer controls.

## 14. Acceptance Criteria

- Attendees can browse, open, join/leave/interested, read updates, and use supported attendee status flows.
- Unauthorized users cannot see private/management actions.
- Deep links route correctly.

## 15. Verification Commands

- `pnpm --filter @freediving.ph/mobile test`
- `pnpm --filter @freediving.ph/mobile type-check`
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

- Browse events.
- Open public/member/private event cases.
- Join/leave/interest.
- Open pass/payment proof flow if implemented.
- Tap event notification/deep link.

## 17. Rollback/Risk Notes

Rollback attendee event mobile changes. Risk is exposing organizer state to attendees.

## 18. Handoff Notes For The Next Initiative

Organizer management is intentionally split into `09-events-organizer-management-parity.md`.
