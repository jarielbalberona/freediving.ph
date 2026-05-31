# 16 Navigation, Deep Linking, And Platform Hardening

Status: Ready After Previous
Ready for execution: yes
Execution started: no
Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.
PASS criterion: mobile navigation, deep links, auth gates, placeholders, and platform contracts are consistent across parity surfaces.

## Readiness Rationale

This is sequence-gated, not blocked. It is intentionally late because it hardens the release-candidate surface set, but autonomous execution should proceed here after the prior feature initiatives finish.

## 1. Purpose

Harden the mobile app shell after feature parity work so routes, deep links, auth gates, tabs/drawer items, notification targets, and unsupported placeholders behave consistently.

## 2. Scope

- Expo Router route inventory.
- Shared navigation contract alignment.
- Deep-link resolution for profiles, media, Chika, messages, buddies, Explore, groups, events, schools, instructors, saved, reports where implemented.
- Auth-gated redirect consistency.
- Placeholder removal or honest parked states.
- Notification route listener hardening.
- Browser/link handling.
- App-level loading/error fallback states.

## 3. Explicit Non-Goals

- New product features.
- Emulators/device runtime tests.
- Backend changes unless a route contract gap is real.

## 4. Dependencies

- Most product initiatives `01` through `15`, at least for every surface included in the release candidate.

## 5. Files And Areas Likely Involved

- `apps/mobile/app/**`
- `apps/mobile/src/config/navigation.ts`
- `packages/types/src/navigation.ts`
- `apps/mobile/src/features/shared/links/**`
- `apps/mobile/src/features/notifications/components/push-notification-route-listener.tsx`
- `apps/mobile/src/components/shell/**`

## 6. Existing Web Source Of Truth

Web canonical paths in `apps/web/src/app/**` and web navigation/sidebar in `apps/web/src/config/nav.ts`.

## 7. Existing Mobile Implementation Status

Mobile has bottom tabs, drawer items, shared link resolver, and several placeholders. Route coverage is incomplete for many web surfaces.

## 8. Backend/Shared Contract Status

Navigation contract exists in `packages/types/src/navigation.ts`. Deep-link route handling is app-owned but target data permissions are backend-owned.

## 9. Implementation Steps

1. Enumerate web and mobile route surfaces.
2. Update shared navigation only if product-visible nav changes are needed.
3. Harden link resolver for all implemented mobile target types.
4. Add auth-gate redirect checks.
5. Replace stale placeholders or mark honestly parked.
6. Add route/deep-link unit tests.

## 10. Role/Auth/Privacy Rules

Deep links must not bypass auth, privacy, block, membership, organizer, school, instructor, admin, or moderation guards.

## 11. UX Rules For Native Mobile

Unsupported links should land on a clear unavailable/needs-web state, not a blank screen. Implemented links should preserve native navigation stack expectations.

## 12. Data/Source-Of-Truth Rules

Routes are navigation state only. Entity existence and access come from backend fetches.

## 13. Implementation Guards

- Stop if a deep-link target would expose unauthorized data before fetch validation.
- Do not add nav items to unfinished placeholder routes.
- Do not fake parity by routing to generic home.

## 14. Acceptance Criteria

- Every implemented mobile surface has a stable route/deep-link contract.
- Auth gates are deterministic.
- Notification taps route correctly.
- Placeholder routes are intentional and documented.

## 15. Verification Commands

- `pnpm --filter @freediving.ph/mobile test`
- `pnpm --filter @freediving.ph/mobile type-check`
- `pnpm --filter @freediving.ph/types test` if navigation contract changes
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

- Open profile/media/Chika/message/buddy/site/group/event/school/instructor links.
- Open protected links signed out.
- Tap representative notification targets.
- Confirm unsupported links show honest fallback.

## 17. Rollback/Risk Notes

Rollback navigation/link resolver changes. Risks are auth bypass, dead links, and notification misrouting.

## 18. Handoff Notes For The Next Initiative

Final audit should run after platform route hardening.
