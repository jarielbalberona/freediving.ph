# 07 Groups Parity

Status: passed
Ready for execution: yes
Execution started: yes
Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.
PASS criterion: mobile groups support discovery, detail, membership, invitations, posts, creation, and lightweight allowed management without bypassing role rules.
Latest execution result: PASS on 2026-06-01. Mobile Groups now supports search/filter/my-groups controls, create-group flow, role-aware detail/membership/post surfaces, deep-link smoke, targeted tests, and iOS Simulator smoke on iPhone 17 Pro Max. Destructive archive/delete/member management and group media image wiring remain intentionally out of scope.

## Readiness Rationale

This is sequence-gated, not blocked. Mobile groups already have list/detail/membership/posts foundations; remaining parity can proceed after media and relationship primitives are in place.

## 1. Purpose

Bring mobile group behavior to parity for user-facing community workflows.

## 2. Scope

- Groups list/search/filter.
- Group detail.
- Join/leave/request join.
- Invite accept/reject.
- Member list and role display.
- Group posts list/detail if supported.
- Create group post.
- Create group.
- Group image/cover if supported.
- Basic settings if allowed.
- Member actions if allowed.
- Group deep links.
- User-facing report actions if included by safety contracts.

## 3. Explicit Non-Goals

- Full destructive group management unless marked ready by product.
- Bypassing owner/moderator/member role rules.
- Events, schools, admin.

## 4. Dependencies

- `01-auth-onboarding-account-setup.md`
- `03-media-posts-comments-deep-links.md` if group image/cover uses media.
- `14-user-safety-report-block.md` if report/block actions are included.

## 5. Files And Areas Likely Involved

- `apps/mobile/src/features/groups/**`
- `apps/mobile/app/(app)/(tabs)/(home)/groups/**`
- `apps/web/src/app/groups/**`
- `apps/web/src/features/groups/**`
- `packages/types/src/index.ts`
- `services/fphgo/internal/features/groups/**`

## 6. Existing Web Source Of Truth

- `apps/web/src/app/groups/page.tsx`
- `apps/web/src/app/groups/[slug]/page.tsx`
- `apps/web/src/app/management/groups/**`
- `apps/web/src/features/groups/**`
- `docs/social/groups.md`

## 7. Existing Mobile Implementation Status

Mobile has list/detail, join/leave, invitation accept/reject, members, posts, and create group post. It lacks creation, richer filters, deep-link hardening, image/cover, and management actions.

## 8. Backend/Shared Contract Status

Group list/detail/join/leave/invite/member/post contracts exist. Management actions must be verified before exposing mobile controls.

## 9. Implementation Steps

1. Add search/filter and better list states.
2. Harden group detail/deep-link loading.
3. Add create group flow using backend contract.
4. Add post detail if supported.
5. Add image/cover only if existing media contracts cover group context.
6. Add basic settings/member actions only if backend role rules are explicit.

## 10. Role/Auth/Privacy Rules

Visibility, membership, invitation, posting, owner/moderator actions, and private-group access must be backend-driven.

## 11. UX Rules For Native Mobile

Use concise member and post rows, native action sheets for allowed actions, and confirmation for leave/remove.

## 12. Data/Source-Of-Truth Rules

Group membership and roles are server truth. Local UI state cannot grant access or posting rights.

## 13. Implementation Guards

- Stop if create/settings/member action payloads are unclear.
- Stop if private group visibility cannot be represented safely.
- Do not implement destructive archive/delete unless separately approved.

## 14. Acceptance Criteria

- Users can discover, join/request/leave, accept/reject invites, read/post, and create groups where allowed.
- Role labels and action availability match backend state.
- Deep links load correct group state.

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

- Browse groups.
- Open public/private/invite groups.
- Join/leave/request.
- Accept/reject invite.
- Create group and group post.

## 17. Rollback/Risk Notes

Rollback group mobile changes. Risks are role bypass and private group leakage.

## 18. Handoff Notes For The Next Initiative

Event attendee parity should remain separate from group behavior; do not merge event management into groups.
