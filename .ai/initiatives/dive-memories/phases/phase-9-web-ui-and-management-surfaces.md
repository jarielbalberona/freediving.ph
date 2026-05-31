# Phase 9: Web UI And Management Surfaces

Status: passed

Allowed values: `pending`, `in_progress`, `repairing`, `passed`, `passed_with_issues`, `blocked`, `failed`.

Do not use `completed` or `done`.

## Goal

Add safe web surfaces for viewing, creating, and managing Dive Memories where feasible.

## Scope

- `apps/web/src/features/profile`
- web API clients/hooks/query keys for Dive Memories
- profile Diving tab memory display/management surfaces
- Dive Map marker memory display if Phase 7 exposed it
- tagged-memory management UI or safe fallback
- focused web tests

## Out Of Scope

- No mobile UI.
- No complex album editor.
- No notifications.
- No real-time behavior.
- No manual browser UX smoke tests during autonomous execution.

## Inputs

- Shared contracts from Phase 6.
- Backend APIs from Phases 3-8.
- Existing profile tab composition.

## Tasks

- Add web API clients/hooks for memory reads and writes.
- Add create/edit/delete surfaces for owner memories if feasible.
- Add visible memory display in profile, map marker, Journey, and Passport surfaces where supported by prior phases.
- Add tagged-memory management surface or safe fallback that does not expose pending/declined/hidden tags publicly.
- Add empty/error/loading states.
- Add tests/type-check/lint coverage.

## Verification Commands

- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web lint`
- `pnpm --filter @freediving.ph/types type-check`
- `git diff --check`

## Expected Evidence

- Web compiles and tests pass.
- UI does not claim memories are proof.
- Pending/declined/hidden tag states are not publicly misrepresented.
- No mobile or app-router unrelated refactor.

## Repair Policy

Allowed repairs: API client typing, component state handling, tests, lint.

Hard-stop if a safe tagged-memory management UX requires product decisions not locked in this initiative.

## Completion Notes

Passed on 2026-06-01. Added web API routes/clients/hooks, public memory display, owner create/edit/delete controls, owner-only tagged-request count fallback, and focused profile tests. Initial unrelated web type/test drift was later resolved in the working tree; final web checks passed.
