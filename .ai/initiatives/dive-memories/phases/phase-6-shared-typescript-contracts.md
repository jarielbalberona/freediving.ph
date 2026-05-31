# Phase 6: Shared TypeScript Contracts

Status: passed

Allowed values: `pending`, `in_progress`, `repairing`, `passed`, `passed_with_issues`, `blocked`, `failed`.

Do not use `completed` or `done`.

## Goal

Add shared TypeScript contracts for Dive Memories API requests and responses.

## Scope

- `packages/types/src/api/dive-memories.ts`
- `packages/types/src/index.ts`
- `packages/types/test`
- web/backend contract alignment review

## Out Of Scope

- No backend behavior changes except contract alignment if Phase 3-5 response shapes require narrow correction.
- No web UI implementation.

## Inputs

- Implemented backend response/request shapes from Phases 3-5.
- Existing shared type patterns for Dive Map, Journey, Passport, and Badges.

## Tasks

- Define memory visibility and tag status types.
- Define memory, media, tag, create/update, tag action, list, and detail response DTOs.
- Export contracts from `packages/types/src/index.ts`.
- Add shared type tests.
- Ensure contracts do not imply memories are proof.

## Verification Commands

- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`
- `git diff --check`

## Expected Evidence

- Shared contracts compile and test.
- DTO names and fields match backend JSON behavior.
- Contracts distinguish social memory data from Dive Map proof data.

## Repair Policy

Allowed repairs: type export drift, test corrections, DTO naming alignment.

Hard-stop if backend and shared contract shape conflict in a way that requires product/API redesign.

## Completion Notes

Phase 6 passed on 2026-06-01. Added shared TypeScript Dive Memories request/response/tag contracts, exported them from `packages/types`, and added contract tests proving memory DTOs do not imply proof, unlock state, badge state, or visited-site counts.
