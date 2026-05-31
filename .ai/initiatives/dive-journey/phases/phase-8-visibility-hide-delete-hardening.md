# Phase 8: Visibility/Hide/Delete Hardening

Status: passed

## Objective

Prove Journey visibility and hide/delete behavior before the feature is treated as complete.

## Goal

Prove private/followers/public visibility and hide/delete semantics for manual and generated Journey entries.

## Scope

- Journey service tests.
- Journey handler tests.
- Shared type tests for visibility states.
- Web tests for visible/hidden/empty states where applicable.
- Targeted fixes only where tests expose violations.

## Out Of Scope

- No new product features.
- No new visibility states without product approval.
- No notifications.
- No broad refactors unrelated to Journey visibility/editing rules.

## Non-Goals

- Do not weaken auth or visibility to make tests pass.
- Do not invent follower behavior.
- Do not alter the locked Journey or Dive Map product rules.

## Dependencies

- Completed Phases 3 through 7.
- Phase 1 visibility/follower findings.
- Existing auth/visibility test helpers.

## Tasks

- Add or strengthen tests for private/followers/public visibility where applicable.
- Add or strengthen tests for manual entry delete/hide behavior.
- Add or strengthen tests for generated entry hide/archive behavior.
- Add tests proving unauthorized users cannot edit or delete another user's entries.
- Fix only code paths that violate these rules.

## Verification Requirements

- Tests must cover `public`, `followers`, and `private` where applicable.
- If followers are unavailable, tests/report must reflect the product-approved fallback or hard stop.
- Tests must prove generated entries use hide/archive semantics where implemented.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_journey/...`
- `cd services/fphgo && go test ./internal/features/profiles/...` if profile reads are affected.
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web test`
- `git diff --check`

## Expected Evidence

- Tests prove visibility enforcement.
- Tests prove manual entry owner-only editing.
- Tests prove generated entries prefer hide/archive where implemented.
- Phase report names any remaining visibility risk.

## Repair Policy

Allowed repairs:

- service logic corrections inside Journey/profile scope
- repository query corrections
- contract test corrections
- web rendering guard fixes
- formatting issues

Hard-stop if enforcing visibility conflicts with existing auth behavior, requires a missing follower model, or requires new product visibility states.

## Stop Conditions

- Follower visibility cannot be enforced and no fallback was approved.
- Existing auth conflicts with required visibility.
- New visibility states are required.

## Expected Report Output

- Visibility tests added or strengthened.
- Hide/delete/archive behavior verified.
- Remaining visibility risks.
- Evidence that unauthorized users cannot edit/delete entries.

## Completion Notes

Completed on 2026-05-31.

- Strengthened repository tests for public/followers/private visibility, manual soft delete behavior, generated hide/archive behavior, and hidden-entry read exclusion.
- Added generated-entry hide support scoped by owner, entry type, `source_type`, and `source_id`.
- Added service tests for generated hide source identity validation, not-found mapping, and source-scoped archive behavior.
- Added shared type tests for locked visibility states and hidden state contracts.
- Strengthened web static tests to prove Journey UI keeps delete controls owner/custom-only and does not present Journey as proof.
- Did not introduce new visibility states, notifications, upstream producer behavior, or source-of-truth mutations.
