# 00 Mobile-Web Parity Assessment Lock

Status: Done
Ready for execution: yes
Execution started: yes
PASS criterion: assessment evidence is locked, dependency order is accepted, and no app code is changed.

## Readiness Rationale

This assessment lock has already passed and remains the evidence baseline for the autonomous sequence. It is kept executable only for reassessment if the source parity assessment materially changes.

## 1. Purpose

Lock the mobile-web parity assessment into an executable initiative sequence. This is the control document that prevents later agents from jumping straight into implementation without respecting scope, dependencies, and product decisions.

## 2. Scope

- Validate `docs/mobile-web-parity-assessment.md` against current route and feature inventories.
- Confirm the initiative sequence under `.ai/initiatives/mobile-web-parity/`.
- Mark which later initiatives are implementation-ready, decision-gated, or web-only/mobile-triage.
- Update `.ai/state/current-state.md` with the new parity plan.

## 3. Explicit Non-Goals

- No app, service, package, schema, or test implementation.
- No new mobile routes.
- No API or DTO changes.

## 4. Dependencies

- `.ai/core/*`
- `docs/mobile-web-parity-assessment.md`
- Current repo route inventories.

## 5. Files And Areas Likely Involved

- `.ai/initiatives/mobile-web-parity/**`
- `.ai/state/current-state.md`
- Read-only references: `apps/web/src/app/**`, `apps/mobile/app/**`, `apps/web/src/features/**`, `apps/mobile/src/features/**`, `packages/types/src/**`, `services/fphgo/internal/features/**`.

## 6. Existing Web Source Of Truth

Web route and feature modules listed in `docs/mobile-web-parity-assessment.md`, especially profile, media, Chika, messaging, buddies, Explore, groups, events, schools, instructors, saved, search/content, safety/report/block, admin, and management surfaces.

## 7. Existing Mobile Implementation Status

Mobile has real implementations for core social surfaces and placeholders for schools, manage schools, instructor application, learn, founder note, and search.

## 8. Backend/Shared Contract Status

Shared contracts exist across `packages/types/src`, with fphgo backend features under `services/fphgo/internal/features`. This initiative must not change them.

## 9. Implementation Steps

1. Re-run route and feature inventory greps.
2. Confirm `docs/mobile-web-parity-assessment.md` still matches the checkout.
3. Review this initiative sequence with a human.
4. Mark downstream initiatives as ready only when their product decisions are settled.

## 10. Role/Auth/Privacy Rules

Do not infer readiness for any role-gated surface. Admin, moderation, organizer, school owner/admin, instructor, buddy, block, report, and booking surfaces require backend policy alignment.

## 11. UX Rules For Native Mobile

This phase does not design mobile UX. Later phases must match capability, not web layout.

## 12. Data/Source-Of-Truth Rules

Assessment data is planning evidence only. Runtime truth remains backend contracts and persistent storage.

## 13. Implementation Guards

- Stop if the parity report is missing.
- Stop if route inventory contradicts the report in a way that changes sequencing.
- Stop if a later implementation scope is requested inside this lock phase.

## 14. Acceptance Criteria

- All parity initiative files exist.
- Dependency order is explicit.
- Decision-gated initiatives are clearly marked.
- State file reflects the plan.

## 15. Verification Commands

- `find .ai/initiatives/mobile-web-parity -maxdepth 1 -type f | sort`
- `rg -n "Status:|PASS criterion|BLOCKED criterion|Verification Commands" .ai/initiatives/mobile-web-parity`
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

- Open each initiative file and verify it is independently reviewable.
- Confirm later management/admin initiatives are not marked as casually ready.
- Confirm proof-based Dive Map rule is present where relevant.

## 17. Rollback/Risk Notes

Rollback is deletion of the new `.ai/initiatives/mobile-web-parity/` folder and removal of the current-state entry. Risk is planning drift, not runtime breakage.

## 18. Handoff Notes For The Next Initiative

Run `01-auth-onboarding-account-setup.md` first after this plan is reviewed and locked.

## Completion Notes

- Completed on 2026-06-01.
- The mobile-web parity assessment and initiative sequence are locked for execution.
- No app, service, package, schema, or test code was changed.
- Decision-gated initiatives remain not ready: `09-events-organizer-management-parity.md`, `11-school-management-parity.md`, `13-saved-search-learn-guides.md`, and `15-admin-moderation-mobile-triage.md`.
- Execution report: `.ai/initiatives/mobile-web-parity/reports/00-mobile-web-parity-assessment-lock.md`.
