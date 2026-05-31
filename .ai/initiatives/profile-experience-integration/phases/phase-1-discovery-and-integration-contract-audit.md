# Phase 1: Discovery And Integration Contract Audit

Status: pending

## Objective

Establish the real current contracts, source boundaries, and implementation status of Profile Badges, Dive Map, Dive Journey, and Dive Passport before hardening begins.

## Goal

Inspect locked initiatives, Profile Badges implementation, profile APIs, shared contracts, and web profile composition.

## Scope

- Read-only inspection of `.ai/initiatives/user-dive-map`, `.ai/initiatives/dive-journey`, `.ai/initiatives/dive-passport`.
- Read-only inspection of Profile Badges backend/shared/web implementation.
- Read-only inspection of profile routes, route snapshots, shared contracts, and profile UI composition.
- Phase report with current integration map.

## Out Of Scope

- No application code changes.
- No migrations.
- No contracts.
- No UI changes.
- No execution of later phases.

## Non-Goals

- Do not invent missing module behavior.
- Do not resolve product/UX ambiguity by guesswork.
- Do not mark later phases complete.

## Dependencies

- Locked source initiatives.
- `services/fphgo/internal/features/profiles`.
- `packages/types/src/api/badges.ts`.
- `apps/web/src/features/profile`.

## Tasks

- Inspect Profile Badges routes, services, repository tests, shared contracts, and web components.
- Inspect implemented or planned Dive Map, Journey, and Passport packages/contracts.
- Identify existing route snapshot and contract test coverage.
- Identify current public profile UI composition and owner controls.
- Create a module ownership map.
- List missing modules, missing contracts, and unresolved product questions.

## Verification Requirements

- Discovery only.
- Report must include exact file paths and module status.

## Verification Commands

- `git status --short`
- `rg "badge|badges|user_dive_sites|dive_journey|dive_passport|visibility|source_type|source_id" services/fphgo packages/types apps/web/src .ai/initiatives`
- `find services/fphgo/internal/features -maxdepth 2 -type d | sort`
- `find apps/web/src/features/profile -maxdepth 3 -type f | sort`

## Expected Evidence

- Current implementation status for all four modules.
- Badge source/visibility contract summary.
- Route and UI composition summary.
- Missing dependency and hard-stop list.

## Repair Policy

Allowed repairs:

- None. This phase is read-only discovery.

Hard-stop instead of continuing if locked initiatives conflict, source ownership is ambiguous, profile UI composition requires immediate product direction, or implementation status cannot be determined safely.

## Stop Conditions

- Conflicting locked initiative specs.
- Ambiguous source-of-truth ownership.
- Missing critical module contract with no safe fallback.
- Dirty worktree changes make discovery unreliable.

## Expected Report Output

- Integration ownership matrix.
- Implemented/missing module list.
- Contract and test coverage map.
- Hard stops or next-phase readiness.

## Completion Notes

Filled by the execution skill or runner.
