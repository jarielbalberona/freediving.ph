# 15 Admin Moderation Mobile Triage Report

Final status: PASS
Date: 2026-06-01

## Summary

Mobile now has a triage-first moderation surface at `moderation`. It uses the existing report contracts for list/detail/status updates, keeps backend permissions canonical, requires an audit note before status transitions, and deliberately does not expose destructive user/content moderation actions.

This is the right boundary. Mobile moderation is useful for queue review and low-risk workflow state changes; sanctions, hide/unhide, super-admin panels, and broader destructive actions need a tighter product/security policy before native exposure.

## Files Changed

- `apps/mobile/app/(app)/(tabs)/(home)/_layout.tsx`
- `apps/mobile/app/(app)/(tabs)/(home)/moderation.tsx`
- `apps/mobile/src/features/moderation/api/moderation-api.ts`
- `apps/mobile/src/features/moderation/hooks/use-moderation.ts`
- `apps/mobile/src/features/moderation/screens/moderation-triage-screen.tsx`
- `apps/mobile/src/features/shared/links/lib/resolve-fph-link.ts`
- `apps/mobile/src/features/shared/links/__tests__/resolve-fph-link.test.ts`
- `apps/mobile/src/lib/query/query-keys.ts`
- `apps/mobile/test/admin-moderation-mobile-triage.test.mjs`
- `apps/mobile/test/resolve-fph-link.test.mjs`

## Verification

Passed:

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test -- admin-moderation-mobile-triage.test.mjs resolve-fph-link.test.mjs user-safety-report-block-parity.test.mjs`
  - Result: pass, 69 mobile tests.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`
  - Result: pass.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`
  - Result: pass, Biome checked 259 files.
- iOS Simulator smoke:
  - Device: iPhone 17 Pro Max, iOS 26.4.
  - Command: `xcrun simctl openurl booted 'freediving-ph-app://moderation'`.
  - Result: pass. The native Moderation screen rendered filters, target chips, and empty state without redbox/runtime crash.
  - Screenshot: `/tmp/fph-ios-moderation-15.png`.

Pending final tranche check:

- `git diff --check` will be rerun after initiative 15 state/report updates and before the final parity gate.

Skipped:

- Real report status mutations were not submitted during automated smoke because they alter moderation data. Use seeded throwaway reports for manual mutation proof.
- Backend tests were not run because no backend code changed.
- Shared type tests were not run because no shared contracts changed.

## Implementation Notes

- The route is wrapped in `MobileAuthRequired`; backend remains authoritative for `reports.read` and `reports.moderate` permissions.
- Link resolver coverage maps `/moderation`, `/moderation/reports/[id]`, `/admin/moderation`, and `/admin/moderation/reports/[id]` to the mobile triage route.
- The status mutation requires a non-empty audit note before calling the backend.
- Rejecting a report uses a native confirmation dialog.
- The UI explicitly labels mobile moderation as triage-only and leaves sanctions/hide/unhide actions on web.

## Risks And Limitations

- accepted: Destructive moderation actions remain web-owned until a stricter mobile policy is approved.
- accepted: Automated smoke did not execute dirtying moderation mutations. Manual QA should use seeded throwaway reports.
- active: Report visibility, status transitions, permissions, and audit behavior remain backend-canonical. Mobile cache must not be treated as moderation truth.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Decisions

No durable destructive-action decision was added. The implementation follows the initiative's safe triage-first path.

## Next Initiative Readiness

`17-final-parity-audit-and-release-gate.md` is ready next. It should audit the final mobile route/feature surface, run release-gate checks, and report any remaining parity gaps instead of opening new product scope.
