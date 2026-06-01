# 09 Events Organizer Management Parity Report

Final status: PASS
Date: 2026-06-01

## Summary

Mobile now has a native, backend-gated event organizer management route at `/events/[slug]/manage`. The route is reachable from event detail only when the event detail contract grants `viewerCanManage`, and it supports the safe mobile organizer subset backed by existing backend contracts: participant list/search/filter, approve/reject, attended/no-show/confirmed status updates, manual pass token check-in, payment proof URL opening, and payment approve/reject review.

Full desktop event setup, module configuration, program editing, sponsor editing, awards editing, and destructive event settings were intentionally left out. Those workflows are higher-risk, less field-oriented, and not required to make core organizer mobile behavior usable.

## Files Changed

- `apps/mobile/app/(app)/(tabs)/(home)/_layout.tsx`
- `apps/mobile/app/(app)/(tabs)/(home)/events/[slug]/manage.tsx`
- `apps/mobile/src/features/events/api/events-api.ts`
- `apps/mobile/src/features/events/hooks/use-event-management.ts`
- `apps/mobile/src/features/events/screens/event-detail-screen.tsx`
- `apps/mobile/src/features/events/screens/event-organizer-management-screen.tsx`
- `apps/mobile/src/features/shared/links/lib/resolve-fph-link.ts`
- `apps/mobile/src/features/shared/links/__tests__/resolve-fph-link.test.ts`
- `apps/mobile/src/lib/query/query-keys.ts`
- `apps/mobile/test/events-organizer-management-parity.test.mjs`
- `apps/mobile/test/resolve-fph-link.test.mjs`

## Verification

Passed:

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test -- events-organizer-management-parity.test.mjs resolve-fph-link.test.mjs events-attendee-parity.test.mjs`
  - Result: pass, 65 mobile tests.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`
  - Result: pass.
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`
  - Result: pass, Biome checked 250 files.
- `git diff --check`
  - Result: pass.
- iOS Simulator smoke:
  - Device: iPhone 17 Pro Max, iOS 26.4.
  - Command: `xcrun simctl openurl booted 'freediving-ph-app://events/event-1/manage'`.
  - Result: pass. The organizer management screen rendered `event-1`, summary counts, check-in input, filters, and a participant card without redbox/runtime crash.
  - Screenshot: `/tmp/fph-ios-event-manage-09-guard.png`.

Skipped:

- Real approve/reject/check-in/payment mutations were not submitted during automated smoke because they alter live/local event state. Use throwaway seeded data for manual mutation proof.
- Backend tests were not run because no backend code changed.
- Shared type tests were not run because no shared contracts changed.

## Implementation Notes

- The client does not infer management rights. It requires the backend `event.viewerCanManage` field before rendering the organizer workspace and uses authenticated backend organizer endpoints for every mutation.
- Reject participant, no-show, and reject payment actions use native confirmation dialogs.
- Payment proof viewing uses the backend signed proof URL endpoint and opens the returned URL through `Linking`.
- Manual pass token check-in uses the existing backend check-in endpoint. Camera QR scanning remains a later UX enhancement, not a contract gap.

## Risks And Limitations

- accepted: Mobile organizer management now covers core field operations, but does not expose full web setup/settings/program/sponsor/award management.
- accepted: Automated smoke did not execute dirtying organizer mutations. Manual QA should use seeded throwaway participants/payments/passes.
- active: Backend remains the canonical source for role, participant status, payment state, pass validity, and audit fields. Mobile cache must not be treated as management truth.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Decisions

No durable product decision was added. This implementation follows the latest user-approved scope and existing backend/web organizer contracts.

## Next Initiative Readiness

`11-school-management-parity.md` is ready to execute next, with the same role/destructive-action discipline.
