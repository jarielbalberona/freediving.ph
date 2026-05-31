# 15 Admin And Moderation Mobile Triage

Status: Ready After Previous
Ready for execution: yes
Execution started: no
Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses; default to triage/read-only or explicitly supported low-risk actions unless the initiative proves destructive actions are safe and role-guarded.

## Readiness Rationale

This is sequence-gated, not blocked. A triage/read-only moderation surface can be implemented without guessing destructive policy. Execution must hard-stop before adding destructive moderation/admin actions unless existing backend policy and role/audit behavior make the action unambiguous.

## 1. Purpose

Plan optional mobile admin/moderation parity as triage-first, not automatic destructive dashboard parity.

## 2. Scope

Possible after approval:

- Moderator/admin mobile triage queue.
- Reports list/detail.
- Dive-site submission/edit review read view.
- Minimal status updates if approved.
- User/content moderation actions only if product and security approve.
- Super-admin surfaces only if explicitly justified.

## 3. Explicit Non-Goals

- Full destructive moderation by default.
- Super-admin admin panels without explicit need.
- Bypassing backend role checks.
- Admin school/event/group owner workflows.

## 4. Dependencies

- `14-user-safety-report-block.md`
- Product/security decision on mobile moderation scope.
- Existing backend moderation/report/admin APIs.

## 5. Files And Areas Likely Involved

- `apps/web/src/app/admin/**`
- `apps/web/src/app/admin/moderation/**`
- `apps/web/src/features/reports/**`
- `apps/web/src/features/admin/**`
- future `apps/mobile/src/features/moderation/**`
- `packages/types/src/reports.ts`
- `packages/types/src/api/admin.ts`
- `services/fphgo/internal/features/reports/**`
- `services/fphgo/internal/features/admin/**`
- `services/fphgo/internal/features/moderation_actions/**`

## 6. Existing Web Source Of Truth

- `/admin`
- `/admin/moderation`
- `/admin/moderation/reports`
- `/admin/moderation/explore-sites`
- `/admin/buddies`
- `/admin/dive-sites`
- `/admin/groups`
- `/admin/instructors`

## 7. Existing Mobile Implementation Status

No mobile admin/moderation implementation was found.

## 8. Backend/Shared Contract Status

Report, moderation action, admin, and explore review APIs exist for web. Mobile must not expose them until role and destructive-action scope is approved.

## 9. Implementation Steps

1. Product/security chooses triage-only or approved action set.
2. Add role-gated moderation route shell.
3. Implement read-only report queue first.
4. Add approved status/action mutations with confirmations.
5. Add audit-friendly reason capture.
6. Add tests for unauthorized/moderator/admin/super-admin states.

## 10. Role/Auth/Privacy Rules

Moderator/admin/super-admin role checks must happen both client-side for hiding UI and backend-side for enforcement. Mobile must not expose hidden private data to unauthorized users.

## 11. UX Rules For Native Mobile

Use triage queues and detail sheets. Destructive actions require explicit reason and confirmation.

## 12. Data/Source-Of-Truth Rules

Reports, moderation action status, user state, and audit logs are backend truth.

## 13. Implementation Guards

- Hard-stop until scope is approved.
- Stop if role claims are not reliable.
- Stop if audit reason requirements are unclear.
- Do not implement destructive actions as convenience buttons.

## 14. Acceptance Criteria

- Only approved triage/actions are exposed.
- Unauthorized users cannot render moderation data.
- Action reasons/confirmations match backend requirements.
- Web and mobile moderation state stays consistent.

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

- Open as member, moderator, admin, super-admin.
- Review reports queue.
- Execute approved action only if included.
- Confirm audit/status appears in web.

## 17. Rollback/Risk Notes

Rollback moderation mobile routes/modules. Risk is high: privacy leaks, unauthorized actions, and audit failures.

## 18. Handoff Notes For The Next Initiative

Platform hardening should include moderation deep links only after this scope is approved.
