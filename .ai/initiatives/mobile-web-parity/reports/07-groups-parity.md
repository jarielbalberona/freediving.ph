# 07 Groups Parity Report

Date: 2026-06-01

Verdict: PASS

## Summary

Mobile Groups now supports practical discovery and creation parity without exposing destructive management. The list has search, visibility, and my-groups filters. Authenticated users can create a group through the existing backend contract. Existing detail behavior remains backend-driven for join/leave, invite accept/reject, role display, members, posts, and create-post draft/outbox behavior.

## Implemented Items

- Added mobile group creation API wrapper using shared `CreateGroupRequest`.
- Added create-group mutation with payload normalization and list cache updates.
- Added group list query params for search, visibility, and mine filters.
- Added Groups screen controls for search, public/private/all, my groups, reset filters, and create group.
- Added native create-group form for name, bio, location, description, visibility, and join policy.
- Preserved private-group guard: private groups force invite-only in the mobile form.
- Added targeted group parity tests for discovery/create and role-backed detail behavior.

## Files Changed

- `apps/mobile/src/features/groups/api/groups-api.ts`
- `apps/mobile/src/features/groups/hooks/use-group-mutations.ts`
- `apps/mobile/src/features/groups/hooks/use-groups-query.ts`
- `apps/mobile/src/features/groups/screens/groups-screen.tsx`
- `apps/mobile/src/lib/query/query-keys.ts`
- `apps/mobile/test/groups-parity.test.mjs`
- `.ai/initiatives/mobile-web-parity/07-groups-parity.md`
- `.ai/initiatives/mobile-web-parity/reports/07-groups-parity.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `docs/mobile-web-parity-assessment.md`

## Verification

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint` PASS
- `xcrun simctl openurl booted 'freediving-ph-app:///(app)/(tabs)/(home)/groups'` PASS.
- `xcrun simctl io booted screenshot /tmp/fph-ios-groups-07.png` PASS; screenshot showed list filters, create group control, and group rows without redbox.
- `xcrun simctl openurl booted 'freediving-ph-app:///(app)/(tabs)/(home)/groups/runtime-smoke-member-group'` PASS.
- `xcrun simctl io booted screenshot /tmp/fph-ios-groups-detail-07.png` PASS; screenshot showed detail membership state, post composer, posts, and members without redbox.
- `git diff --check` PASS

## Skipped Checks

- Shared type tests skipped because shared contracts were not changed.
- Backend tests skipped because backend code was not changed.
- Android/emulator/device tests skipped by initiative instruction.

## Repairs Attempted

- None. Targeted test, type-check, lint, and diff checks passed after implementation.

## Unrelated Drift Classification

The worktree already contained prior mobile-web parity changes for initiatives 01-06 and their reports. Those changes were preserved and not reverted.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

No durable product decision was added to `.ai/state/decisions.md`.

## Risks And Limitations

- accepted: Group image/cover upload was not wired. Backend supports media IDs, but mobile group image selection and ownership policy should be specified before exposing it.
- accepted: Basic destructive management, archive/delete, invite-by-user-id, and member actions remain web/management scope. Exposing those on mobile without tighter UX guards would be sloppy.
- active: Private group visibility remains backend-canonical. Mobile must not infer access from list/detail cache state.
- active: Group membership and roles remain server truth; local UI state cannot grant posting, member visibility, or management rights.

## Manual Smoke Checklist

- Search groups by name.
- Toggle Public, Private, and My groups.
- Open a public group detail.
- Join and leave a joinable group.
- Accept/reject an invited group.
- Create a group with public/open settings.
- Create a private group and confirm it is invite-only.
- Create a group post and verify draft fallback on failed post.

## Handoff

Proceed to `08-events-attendee-parity.md`. Keep attendee flows separate from organizer management.
