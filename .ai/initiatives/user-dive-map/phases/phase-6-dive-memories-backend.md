# Phase 6: Dive Memories Backend

Status: pending

## Objective

Implement social/contextual Dive Memories backend behavior without allowing memories to become visit proof.

## Goal

Implement Dive Memories backend persistence and APIs only if Phase 1 confirmed they are V1 scope.

## Scope

- New or existing backend feature package for Dive Memories.
- Goose migrations and schema snapshot for `dive_memories`, `dive_memory_media`, and `dive_memory_tagged_users`.
- sqlc queries and generated package configuration.
- Handlers, services, repositories, validation, and route registration.
- Go tests for memory CRUD, attachments, tagging, visibility, and authorization.

## Out Of Scope

- No web UI changes.
- No effect on `user_dive_sites`.
- No Journey/Passport implementation.
- No automatic badge awarding.
- No formal verification system.

## Non-Goals

- Do not use memories to unlock locations.
- Do not use memories to increase visited-site counts.
- Do not add downstream timeline/passport aggregation.

## Inputs

- Phase 1 V1 scope decision for Dive Memories.
- Phase 2 and Phase 4 schema/API conventions.
- `01-domain-model.md`
- Existing validation/http helper conventions.

## Tasks

- Hard-stop immediately if Phase 1 did not confirm Dive Memories are V1 scope.
- Add non-destructive migrations for memory tables.
- Add sqlc queries and generated code.
- Implement CRUD services with author ownership and visibility checks.
- Implement tagged user support with `status`.
- Implement optional memory media attachment support.
- Ensure no memory service path writes `user_dive_sites`.
- Add route registration and route tests.

## Implementation Notes

- Memory author ownership and tagged-user access are separate concepts.
- `dive_memory_media` attachments do not become proof unless the same media is a qualifying owned media post under media rules.
- Keep handlers thin and put authorization/business rules in services.

## Verification Requirements

- Tests must prove memory writes do not touch `user_dive_sites`.
- Tagged user access tests must cover allowed and denied paths.

## Verification Commands

- `cd services/fphgo && go test ./db/...`
- `cd services/fphgo && make sqlc`
- `cd services/fphgo && go test ./internal/features/dive_memories/...`
- `cd services/fphgo && go test ./internal/features/dive_map/...` if shared marker-detail logic is affected.
- `cd services/fphgo && go test ./internal/app/...`
- `git diff --check`

## Expected Evidence

- Memory tables exist and are non-destructive.
- CRUD tests pass for author-owned memories.
- Tagged user access tests pass.
- Tests prove memory create/update/delete/tagging does not unlock a dive site.
- Route snapshot changes are intentional.

## Repair Policy

Allowed repairs:

- migration syntax failures
- sqlc drift
- Go compile failures
- service/handler test failures inside this phase scope
- route snapshot drift
- formatting issues

Hard-stop for V1 scope ambiguity, privacy ambiguity around tagged users, unclear memory visibility states, or any implementation path that would treat memories as proof.

## Stop Conditions

- Phase 1 did not explicitly confirm Dive Memories are V1.
- Tagged-user privacy rules are unclear.
- Existing visibility states cannot represent memory access.
- Any implementation path would make memories proof.

## Expected Report Output

- Memory tables/routes/contracts added.
- Authorization and tagging rules implemented.
- Tests proving memories do not unlock or count visits.
- Route snapshot evidence when routes changed.

## Completion Notes

Filled by the execution skill or runner.
