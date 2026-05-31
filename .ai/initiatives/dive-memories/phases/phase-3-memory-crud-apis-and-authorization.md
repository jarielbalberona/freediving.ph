# Phase 3: Memory CRUD APIs And Authorization

Status: passed

Allowed values: `pending`, `in_progress`, `repairing`, `passed`, `passed_with_issues`, `blocked`, `failed`.

Do not use `completed` or `done`.

## Goal

Implement authenticated Dive Memory create/update/delete and safe read APIs with author authorization and visibility filtering.

## Scope

- `services/fphgo/internal/features/dive_memories/service`
- `services/fphgo/internal/features/dive_memories/http`
- `services/fphgo/internal/app/routes.go`
- route snapshot tests if routes change
- focused service/handler tests

## Out Of Scope

- No media attachment behavior beyond fields needed for future phases.
- No tagged-user APIs.
- No Map/Journey/Passport integration.
- No web UI.

## Inputs

- Phase 2 schema/repository.
- Existing auth, validation, error, and handler patterns.
- Phase 1 visibility decision.

## Tasks

- Implement create/update/delete service behavior with author-only writes.
- Require `dive_site_id` for Dive Memories in V1.
- Implement soft delete.
- Implement own-memory and profile-visible memory reads.
- Enforce `public`, `tagged`, and `private`; implement `followers` only if Phase 1 proved it safe.
- Add route wiring and tests.
- Prove CRUD does not mutate `user_dive_sites`, badges, Journey, or Passport source data.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_memories/...`
- `cd services/fphgo && go test ./internal/app/...`
- `git diff --check`

## Expected Evidence

- Owner write authorization passes.
- Non-owner writes are rejected.
- Visibility filters are covered.
- Memories cannot unlock sites or inflate counts.

## Repair Policy

Allowed repairs: handler/service validation bugs, route wiring, test setup, status code alignment.

Hard-stop on auth/privacy ambiguity or standalone non-site memory product ambiguity.

## Completion Notes

Phase 3 passed on 2026-06-01. Added Dive Memories service, HTTP DTOs/handlers/routes, app route wiring, profile-visible reads, owner CRUD, visibility filtering through repository owner context, and targeted service/handler/app tests. No Map, Journey, Passport, Badge, web, or tag-management integration was added.
