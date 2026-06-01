# 08 Events Attendee Parity Report

Date: 2026-06-01

Verdict: PASS

## Summary

Mobile Events now covers attendee-facing parity without exposing organizer controls. The Events list has native search and filters. Event detail supports join-form answers, participant notes, status, interest, posts, fish reactions, attendee pass information, payment method display, proof upload/submission, and public program/prize/sponsor sections. Pass deep links route to a read-only mobile pass screen.

## Implemented Items

- Added attendee-safe event APIs for join form fields, my pass, pass verification, payment methods, payment proof submission, program, competitions, prizes, and sponsors.
- Added event attendee query hooks and payment mutation cache invalidation.
- Added Events list search/type/difficulty/price/beginner-friendly filters.
- Added join form rendering and required-field validation before join.
- Added attendee pass section and read-only pass deep-link route.
- Added payment method display, proof image picker/upload, and proof submission using `event_attachment` media context with event ID.
- Added public program, competitions/prizes, and sponsors sections.
- Extended notification/link resolver coverage for `/events/:slug/pass/:token`.
- Added targeted mobile tests for attendee parity and updated the older foundation event boundary assertion.

## Files Changed

- `apps/mobile/app/(app)/(tabs)/(home)/_layout.tsx`
- `apps/mobile/app/(app)/(tabs)/(home)/events/[slug]/pass/[token].tsx`
- `apps/mobile/src/features/events/api/events-api.ts`
- `apps/mobile/src/features/events/hooks/use-event-attendee-queries.ts`
- `apps/mobile/src/features/events/hooks/use-event-mutations.ts`
- `apps/mobile/src/features/events/hooks/use-events-query.ts`
- `apps/mobile/src/features/events/screens/event-detail-screen.tsx`
- `apps/mobile/src/features/events/screens/event-pass-screen.tsx`
- `apps/mobile/src/features/events/screens/events-screen.tsx`
- `apps/mobile/src/features/media/api/media-api.ts`
- `apps/mobile/src/features/shared/links/__tests__/resolve-fph-link.test.ts`
- `apps/mobile/src/features/shared/links/lib/resolve-fph-link.ts`
- `apps/mobile/src/lib/query/query-keys.ts`
- `apps/mobile/test/events-attendee-parity.test.mjs`
- `apps/mobile/test/mobile-foundation-contract.test.mjs`
- `apps/mobile/test/resolve-fph-link.test.mjs`
- `.ai/initiatives/mobile-web-parity/08-events-attendee-parity.md`
- `.ai/initiatives/mobile-web-parity/reports/08-events-attendee-parity.md`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `docs/mobile-web-parity-assessment.md`

## Verification

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check` PASS
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint` PASS
- `curl -I --max-time 5 http://127.0.0.1:8081/status` PASS; Metro returned `200 OK` for `apps/mobile`.
- `xcrun simctl list devices booted` PASS; iPhone 17 Pro Max iOS 26.4 was booted.
- `xcrun simctl openurl booted 'freediving-ph-app:///(app)/(tabs)/(home)/events'` PASS.
- `xcrun simctl io booted screenshot /tmp/fph-ios-events-08.png` PASS; screenshot showed Events filters and list rows without redbox.
- `xcrun simctl openurl booted 'freediving-ph-app:///(app)/(tabs)/(home)/events/runtime-smoke-joinable-event'` PASS.
- `xcrun simctl io booted screenshot /tmp/fph-ios-events-detail-08.png` PASS; screenshot showed event detail, join note, join/interested actions, and no redbox.
- `xcrun simctl openurl booted 'freediving-ph-app:///(app)/(tabs)/(home)/events/event-1'` PASS.
- `xcrun simctl io booted screenshot /tmp/fph-ios-events-joined-08.png` PASS; screenshot showed joined state and event pass section without redbox.
- `xcrun simctl openurl booted 'freediving-ph-app:///(app)/(tabs)/(home)/events/event-1/pass/test-token'` PASS.
- `xcrun simctl io booted screenshot /tmp/fph-ios-events-pass-08.png` PASS; screenshot showed read-only pass route error state without redbox.
- `git diff --check` PASS

## Skipped Checks

- Shared type tests skipped because shared contracts were not changed.
- Backend tests skipped because backend code was not changed.
- Android/emulator/device tests skipped by instruction.

## Repairs Attempted

- Attempt 1: mobile test failed because a pre-existing foundation assertion disallowed attendee payment/pass terms before initiative 08. The assertion was narrowed to the real boundary: no participant approval/rejection/admin controls in attendee detail. Re-run passed.

## Unrelated Drift Classification

The worktree already contained prior mobile-web parity changes for initiatives 01-07 and their reports. Those changes were preserved and not reverted.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

No durable product decision was added to `.ai/state/decisions.md`.

## Risks And Limitations

- accepted: Mobile attendee pass displays the canonical token/link, not a generated QR image. Adding native QR rendering should be handled with a dedicated dependency/UX decision or backend-provided QR image.
- accepted: Payment proof upload is implemented for image assets through existing media upload contracts. File/document proof is not implemented because mobile has no document picker dependency in this scope.
- active: Organizer approval/rejection, payment review, check-in, setup, program management, prize/sponsor management, and destructive event actions remain backend/web management scope until initiative 09.
- active: Event participation, payment status, pass validity, private visibility, and post permissions remain backend-canonical. Mobile cache state must not grant access or management capability.

## Manual Smoke Checklist

- Search Events and toggle type, difficulty, price, and beginner-friendly filters.
- Open a public event detail.
- Submit a join request with required join-form fields where present.
- Mark and remove interest.
- Open a joined event and verify attendee status/pass section.
- Submit payment proof on a paid joined event with a configured payment method.
- Open program, prizes, and sponsors sections on events that publish those modules.
- Open an event pass deep link and confirm invalid/private token states do not crash.

## Handoff

Proceed to `10-schools-public-courses-bookings.md`. Keep event organizer management in `09-events-organizer-management-parity.md`.
