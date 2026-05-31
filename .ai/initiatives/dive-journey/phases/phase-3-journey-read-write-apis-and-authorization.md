# Phase 3: Journey Read/Write APIs And Authorization

Status: pending

## Objective

Implement owner-safe manual Journey entry APIs while preserving Journey as downstream timeline data.

## Goal

Implement backend APIs and services for profile Journey reads and authenticated manual entry create/update/delete or hide behavior.

## Scope

- Journey backend feature handlers, services, repositories, and sqlc queries.
- `services/fphgo/internal/app/routes.go`
- Route tests and snapshots under `services/fphgo/internal/app`.
- Go tests for Journey service/repository/handlers.

## Out Of Scope

- No web UI changes.
- No media attachment or tagged-user behavior unless required for compile-only placeholders.
- No generated-entry integration.
- No Dive Map, Badge, Passport, certification, event, or course implementation.

## Non-Goals

- Do not unlock Dive Map locations.
- Do not increase visited-site counts.
- Do not award badges or verify credentials.

## Dependencies

- Phase 1 report.
- Phase 2 schema and generated sqlc output.
- `03-cross-module-data-flow.md`
- Existing auth, validation, and HTTP helper conventions.

## Tasks

- Implement profile Journey read path with viewer/target authorization.
- Implement authenticated manual entry create.
- Implement authenticated manual entry update.
- Implement authenticated manual entry delete or hide according to discovered product convention.
- Enforce that manual entries can omit `dive_site_id` and media.
- Ensure Journey writes do not touch `user_dive_sites`, badges, credentials, or Passport state.
- Add handler/service/repository tests.
- Update route snapshot tests if routes change.

## Verification Requirements

- Tests must prove manual entries work without `dive_site_id` and without media.
- Tests must prove owner-only writes.
- Tests must prove writes do not mutate map, badge, credential, or Passport state.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_journey/...`
- `cd services/fphgo && go test ./internal/features/profiles/...` if profile paths are touched.
- `cd services/fphgo && go test ./internal/app/...`
- `cd services/fphgo && make sqlc`
- `git diff --check`

## Expected Evidence

- Tests prove manual entries work without `dive_site_id`.
- Tests prove manual entries work without media.
- Tests prove users cannot edit another user's entries.
- Tests prove Journey entries do not unlock locations, increase visited counts, award badges, or verify credentials.
- Route snapshot changes are intentional and documented.

## Repair Policy

Allowed repairs:

- Go compile failures
- sqlc generated drift
- handler/service/repository test failures inside this phase scope
- route snapshot drift
- formatting issues

Hard-stop for auth ambiguity, ambiguous ownership/editing rules, ambiguous hide/delete semantics, or any implementation path that makes Journey source-of-truth for another domain.

## Stop Conditions

- Auth or owner editing is ambiguous.
- Hide/delete semantics cannot be determined from conventions.
- Implementation would make Journey source-of-truth for another domain.

## Expected Report Output

- Routes and handlers added.
- Manual entry write/read behavior implemented.
- Authorization tests and route snapshot evidence.
- Explicit non-mutation evidence for map/badge/credential/Passport domains.

## Completion Notes

Filled by the execution skill or runner.
