# Phase 7: Dive Map Marker Integration

Status: passed

Allowed values: `pending`, `in_progress`, `repairing`, `passed`, `passed_with_issues`, `blocked`, `failed`.

Do not use `completed` or `done`.

## Goal

Integrate visible eligible Dive Memories into Dive Map marker detail reads without changing map unlock/count truth.

## Scope

- Dive Map marker detail service/repository integration.
- Dive Memories read boundary for marker-eligible memories.
- Shared DTO additions for marker memory previews if needed.
- Web marker detail display if contract-ready and scoped.
- Backend and web tests for marker eligibility.

## Out Of Scope

- No map unlock/count changes.
- No `user_dive_sites` mutation.
- No full geographic map provider work.
- No Journey/Passport integration.

## Inputs

- Phase 5 tag/visibility behavior.
- Phase 6 shared contracts.
- Existing Dive Map marker APIs and `user_dive_sites` logic.

## Tasks

- Add marker-detail memory read path gated by `user_dive_sites`.
- For author marker display, require author has unlocked same `dive_site_id`.
- For tagged/shared marker display, require tagged user has unlocked same `dive_site_id` and tag/visibility allows display.
- Add tests proving memories never unlock markers or inflate counts.
- Add tests proving ineligible memories are omitted from marker details.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_map/...`
- `cd services/fphgo && go test ./internal/features/dive_memories/...`
- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/web type-check`
- `git diff --check`

## Expected Evidence

- Own memory appears in author marker only with matching `user_dive_sites`.
- Tagged/shared memory appears in tagged user's marker only with matching `user_dive_sites` and allowed tag state.
- Memories do not change marker count, first/last proof, or visited-site count.

## Repair Policy

Allowed repairs: marker query filters, DTO alignment, tests.

Hard-stop on any source-of-truth conflict with `user_dive_sites`.

## Completion Notes

Phase 7 passed on 2026-06-01. Added eligible memory previews to proof-backed Dive Map marker detail reads, gated by existing `user_dive_sites` ownership and memory visibility/tag rules. Marker unlocks, counts, first/last proof, and visited-site count remain owned by `user_dive_sites`.
