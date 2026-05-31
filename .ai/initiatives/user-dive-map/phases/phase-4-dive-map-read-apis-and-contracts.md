# Phase 4: Dive Map Read APIs And Shared Contracts

Status: pending

## Objective

Expose server-owned Dive Map reads and shared contracts without moving unlock logic into the client.

## Goal

Expose backend read APIs and shared TypeScript contracts for profile Dive Map summary and per-site marker details.

## Scope

- Backend handlers/services/repositories for profile Dive Map reads.
- `services/fphgo/internal/app/routes.go`
- Route tests and snapshots under `services/fphgo/internal/app`.
- Shared contracts under `packages/types/src/api` and exports in `packages/types/src/index.ts`.
- Contract tests under `packages/types/test` where applicable.

## Out Of Scope

- No web UI rendering beyond contract compile support.
- No Dive Memories write APIs or read APIs.
- No Journey/Passport/Badge implementation.
- No map filter or region grouping behavior.

## Non-Goals

- Do not expose APIs that let clients manually mark sites visited.
- Do not include own memories, shared memories, tagged memories, or memory-derived content in marker detail responses.
- Do not add feature-local web DTOs for API contracts.

## Inputs

- Phase 1 report.
- Completed Phase 2 and Phase 3 outputs.
- `03-cross-module-data-flow.md`
- Existing profile API and shared type conventions.

## Tasks

- Define shared response contracts for Dive Map marker summary and marker detail.
- Add backend read service for unlocked marker list from `user_dive_sites`.
- Add backend read service for marker detail contents.
- Ensure visited-site count is derived from `user_dive_sites`, not memories.
- Ensure marker detail contents are limited to the target user's own qualifying media posts for the requested unlocked site.
- Add route(s) following existing auth and profile route conventions.
- Add handler/service tests for ownership, visibility, and empty states.
- Update route snapshot tests if routes change.

## Implementation Notes

- Backend services own visibility and unlock enforcement.
- The marker list must be sourced from `user_dive_sites`.
- Marker detail must first prove the target user unlocked the requested `dive_site_id`.

## Verification Requirements

- Shared contract tests must cover the shape used by web.
- Backend tests must prove counts and marker presence come from `user_dive_sites`, not memories.
- Backend tests must prove marker detail returns proof media only.

## Verification Commands

- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`
- `cd services/fphgo && go test ./internal/features/profiles/...`
- `cd services/fphgo && go test ./internal/features/dive_map/...` if a Dive Map package exists.
- `cd services/fphgo && go test ./internal/app/...`
- `git diff --check`

## Expected Evidence

- Shared contracts compile and are exported from `@freediving.ph/types`.
- API tests prove marker list comes from `user_dive_sites`.
- API tests prove locked sites are absent from a user's map.
- Route snapshot changes are intentional and documented.
- Handler remains thin; business rules live in services.

## Repair Policy

Allowed repairs:

- TypeScript contract compile failures
- Go compile failures
- route snapshot drift
- handler/service test failures inside this phase scope
- formatting issues

Hard-stop for auth ambiguity, public/private profile ambiguity, ambiguous route ownership, or conflict with existing profile API contract compatibility.

## Stop Conditions

- Viewer/target profile authorization is unclear.
- Existing profile API compatibility would be broken.
- Route ownership conflicts with current profile or explore API boundaries.

## Expected Report Output

- Routes added or changed.
- Shared contracts added or changed.
- Tests proving locked sites are absent.
- Route snapshot evidence when routes changed.

## Completion Notes

Filled by the execution skill or runner.
