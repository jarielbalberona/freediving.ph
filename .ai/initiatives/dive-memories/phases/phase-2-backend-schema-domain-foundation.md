# Phase 2: Backend Schema/Domain Foundation

Status: passed

Allowed values: `pending`, `in_progress`, `repairing`, `passed`, `passed_with_issues`, `blocked`, `failed`.

Do not use `completed` or `done`.

## Goal

Add the non-destructive backend persistence foundation for Dive Memories.

## Scope

- `services/fphgo/db/migrations`
- `services/fphgo/db/schema/000_schema.sql`
- `services/fphgo/sqlc.yaml`
- new `services/fphgo/internal/features/dive_memories/repo`
- generated sqlc package for Dive Memories
- focused DB/repo tests

## Out Of Scope

- No HTTP routes.
- No web changes.
- No Map/Journey/Passport integration.
- No tag API behavior beyond schema/repo foundations.

## Inputs

- Phase 1 privacy/follower/blocking decision.
- Existing migration/sqlc patterns.
- Existing per-feature repository patterns.

## Tasks

- Add `dive_memories` with author, site, visibility, soft delete, and timestamps.
- Add `dive_memory_media` with memory/media relationship and ordering.
- Add `dive_memory_tagged_users` with pending/accepted/declined/hidden lifecycle.
- Add indexes for author/site/visibility/deleted/tag lookup.
- Add foreign keys without destructive behavior.
- Add sqlc queries and repository methods for CRUD foundations.
- Add tests for migration/query behavior and non-mutation of `user_dive_sites`.

## Verification Commands

- `cd services/fphgo && go test ./db/...`
- `cd services/fphgo && make sqlc`
- `cd services/fphgo && go test ./internal/features/dive_memories/...`
- `git diff --check`

## Expected Evidence

- Migrations are non-destructive.
- sqlc generation is clean.
- Repository tests pass.
- No `user_dive_sites` write path exists in the memory repository.

## Repair Policy

Allowed repairs: migration syntax, sqlc query shape, generated code drift, focused repository test fixes.

Hard-stop on destructive migration risk or source-of-truth conflict with `user_dive_sites`.

## Completion Notes

Phase 2 passed on 2026-06-01. Added non-destructive Dive Memories schema, sqlc queries, repository foundation, and repository integration tests. Local `fph` and `fph_test` databases migrated to version 87. Verification passed for DB tests, sqlc generation, Dive Memories repository tests, and whitespace checks.
