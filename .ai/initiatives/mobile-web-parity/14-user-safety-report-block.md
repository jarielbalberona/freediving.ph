# 14 User Safety, Report, And Block

Status: passed
Ready for execution: yes
Execution started: yes
Execution completed: yes
Completed date: 2026-06-01
Verdict: PASS
Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.
PASS criterion: mobile exposes user-facing report/block controls across supported surfaces without implementing full moderation dashboards.

## Readiness Rationale

This is sequence-gated, not blocked. Safety entry points should be added after the target user-facing surfaces exist, using backend moderation/block policy as canonical truth.

## 1. Purpose

Add user safety parity for reporting, blocking, and blocked/private states on mobile.

## 2. Scope

- Report actions for supported target types.
- Block/unblock user controls.
- Blocked user/profile/content states.
- Report entry points from profile, media, Chika, buddy, group, event, and Explore where contracts support them.
- Clear submitted/error states.
- Respect existing backend moderation and block policy.

## 3. Explicit Non-Goals

- Moderator/admin dashboard.
- Suspension/read-only user actions.
- Shadowban or identity reveal.
- New moderation policy.

## 4. Dependencies

- `02-profile-core-badges-dive-identity.md`
- `03-media-posts-comments-deep-links.md`
- `04-chika-forums-parity.md`
- `05-messaging-notifications-buddy-relationships.md`
- `06-explore-dive-sites-parity.md`
- `07-groups-parity.md`
- `08-events-attendee-parity.md`

## 5. Files And Areas Likely Involved

- future `apps/mobile/src/features/reports/**`
- future `apps/mobile/src/features/blocks/**`
- existing mobile surface modules that host report/block entry points
- `apps/web/src/features/reports/**`
- `apps/web/src/features/blocks/**`
- `packages/types/src/reports.ts`
- `services/fphgo/internal/features/reports/**`
- `services/fphgo/internal/features/blocks/**`

## 6. Existing Web Source Of Truth

- `apps/web/src/features/reports/**`
- `apps/web/src/features/blocks/**`
- relevant report entry points across web surfaces.

## 7. Existing Mobile Implementation Status

No dedicated mobile report/block feature module was found in the assessment.

## 8. Backend/Shared Contract Status

Reports and blocks have shared contracts/backend features. Target-type support must be verified before each entry point is exposed.

## 9. Implementation Steps

1. Add mobile report/block API hooks using shared contracts.
2. Add reusable native report sheet.
3. Add block/unblock controls in profile or user action menus.
4. Add entry points to supported content surfaces.
5. Render blocked states according to backend payload/errors.
6. Add tests for target support, auth gating, and blocked states.

## 10. Role/Auth/Privacy Rules

Reporting/blocking requires auth. Backend owns target validity, duplicate reports, block effects, and visibility suppression.

## 11. UX Rules For Native Mobile

Use short reason selectors and optional details. Avoid dark patterns and avoid implying immediate moderation outcomes.

## 12. Data/Source-Of-Truth Rules

Report status and block relationships are backend truth. Client cache may optimistically hide content only after backend success.

## 13. Implementation Guards

- Stop if a target type is not accepted by backend report contracts.
- Stop if block effects on messaging/buddies/groups are unclear.
- Do not add moderator actions.

## Execution Summary

- Added shared block DTOs and aligned shared report target types with backend report intake.
- Added mobile safety API/hooks for report creation, block, unblock, and blocked-user list reads.
- Added reusable native report sheet with reason selectors and optional details.
- Added profile report/block/unblock controls, blocked relationship messaging, and blocked-user Settings list.
- Added Chika thread and reply report entry points.
- Added message report entry points for non-own text messages.
- Did not add moderator dashboards, suspension/read-only controls, identity reveal, shadowban, or admin actions.

## Verification Result

PASS on 2026-06-01.

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/types type-check`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/types test`
- iOS Simulator smoke on iPhone 17 Pro Max with running Expo/Metro:
  - public profile safety actions: `/tmp/fph-ios-profile-safety-14.png`
  - settings blocked-user state: `/tmp/fph-ios-settings-safety-14.png`
  - Chika thread/reply report actions: `/tmp/fph-ios-chika-safety-14.png`
  - messages list route after message-screen integration: `/tmp/fph-ios-messages-safety-14.png`
- `git diff --check`

Runtime limitation: simulator smoke confirmed touched screens render without redbox and show available safety entry points where seeded data exists. It did not submit real reports or execute a block/unblock mutation to avoid mutating seeded user state during verification.

## 14. Acceptance Criteria

- Users can report supported targets.
- Users can block/unblock supported users.
- Blocked/private states are visible and safe.
- Unsupported targets do not show fake report actions.

## 15. Verification Commands

- `pnpm --filter @freediving.ph/mobile test`
- `pnpm --filter @freediving.ph/mobile type-check`
- `pnpm --filter @freediving.ph/types test` if contracts change
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

- Report profile/media/Chika/group/event/site where supported.
- Block and unblock a user.
- Confirm blocked user messaging/profile behavior.
- Confirm duplicate/error states are clear.

## 17. Rollback/Risk Notes

Rollback report/block mobile module and entry points. Risks are false safety affordances and missed backend policy effects.

## 18. Handoff Notes For The Next Initiative

Admin moderation triage can build on report data after user-facing safety is present.
