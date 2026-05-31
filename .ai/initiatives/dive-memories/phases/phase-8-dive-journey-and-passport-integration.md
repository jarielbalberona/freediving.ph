# Phase 8: Dive Journey And Passport Integration

Status: passed

Allowed values: `pending`, `in_progress`, `repairing`, `passed`, `passed_with_issues`, `blocked`, `failed`.

Do not use `completed` or `done`.

## Goal

Integrate Dive Memories into Journey and Passport as downstream presentation only.

## Scope

- Dive Journey generated/display entry integration for memory source rows.
- Dive Passport recent memories aggregate section.
- Memory-owned visibility read boundary.
- Backend/shared/web tests where affected.

## Out Of Scope

- No Journey authority over memory source data.
- No Passport source table for memories.
- No map proof/count behavior.
- No badge awarding.
- No mobile UI.

## Inputs

- Completed Dive Memories visibility/tag behavior.
- Existing Journey generated-entry helpers.
- Existing Passport aggregate service and memory placeholder.

## Tasks

- Create or expose memory Journey entries with source type `memory` where appropriate.
- Ensure memory-backed Journey entries are idempotent and display-only.
- Add Passport recent memories section using memory-owned visibility filtering.
- Ensure Passport stats do not compute visited-site counts from memories.
- Add tests proving Journey/Passport do not mutate memory, map, badges, credentials, or counts.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_memories/...`
- `cd services/fphgo && go test ./internal/features/dive_journey/...`
- `cd services/fphgo && go test ./internal/features/dive_passport/...`
- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/web type-check`
- `git diff --check`

## Expected Evidence

- Memory appears in Journey/Passport only when visible to viewer.
- Journey remains downstream and display-only.
- Passport remains aggregate/read-only.
- Memories do not affect visited-site counts or badge awards.

## Repair Policy

Allowed repairs: integration adapters, visibility forwarding, DTO alignment, tests.

Hard-stop if integration requires Passport or Journey to own memory source data.

## Completion Notes

Passed on 2026-06-01. Dive Memories now refresh display-only Journey entries for memory source rows and Dive Passport consumes visible recent memories through the memory-owned read boundary. `tagged` and private memories map to private Journey display rows to avoid leaking tag-only visibility through Journey's public/followers/private visibility model.
