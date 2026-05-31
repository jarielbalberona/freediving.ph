# Phase 1: Discovery And Contract Alignment

Status: pending

## Objective

Lock down the actual repository boundaries and unresolved risks before any implementation phase changes code.

## Goal

Establish the exact current media, profile, dive site, auth, visibility, sqlc, route, shared contract, and web UI patterns before implementation starts.

## Scope

- Read-only inspection of `services/fphgo`, `packages/types`, and `apps/web`.
- Identify existing `media_posts`, dive site, profile, visibility, and auth behavior.
- Identify exact package boundaries and tests to modify in later phases.
- Write findings into the phase report.

## Out Of Scope

- No application code changes.
- No migrations.
- No contracts.
- No UI changes.
- No execution of later phases.

## Non-Goals

- Do not decide product behavior beyond confirming whether the locked initiative can proceed.
- Do not normalize or refactor existing backend, frontend, or shared code.
- Do not mark later phases complete.

## Inputs

- `.ai/core/*`
- `.ai/state/*`
- `.ai/initiatives/user-dive-map/00-overview.md`
- `.ai/initiatives/user-dive-map/01-domain-model.md`
- Existing files under `services/fphgo`, `packages/types`, and `apps/web`.

## Tasks

- Inspect `services/fphgo/db/schema/000_schema.sql` and latest media/profile/explore migrations.
- Inspect `services/fphgo/internal/features/media`, `profiles`, and `explore`.
- Inspect route registration and route snapshot conventions under `services/fphgo/internal/app`.
- Inspect shared contract patterns under `packages/types/src`.
- Inspect web profile/media/explore UI and API client patterns under `apps/web/src/features`.
- Decide whether Dive Map should be a new backend feature package or an extension of an existing feature, and justify the choice in the report.
- Confirm whether Dive Memories are in V1 scope or require a product hard stop.

## Implementation Notes

- This phase is read-only by design. Use it to prevent bad execution, not to start coding early.
- Treat unclear proof qualification, ownership, visibility, auth, or Dive Memories V1 scope as execution blockers.

## Verification Requirements

- Commands are discovery commands only.
- The phase report must preserve enough evidence for Phase 2 to proceed without asking the same questions again.

## Verification Commands

- `git status --short`
- `rg "media_posts|dive_site_id|visibility|profile" services/fphgo packages/types apps/web`
- `find services/fphgo/internal/features -maxdepth 2 -type d | sort`
- `find apps/web/src/features -maxdepth 2 -type d | sort`

## Expected Evidence

- Phase report names the exact source-of-truth tables and fields discovered.
- Phase report names the implementation package boundaries for later phases.
- Phase report lists any existing dirty worktree changes before implementation.
- Phase report states whether the initiative can continue or must hard-stop for product/auth/schema ambiguity.

## Repair Policy

Allowed repairs:

- None. This phase is read-only discovery.

Hard-stop instead of continuing if discovery finds destructive migration risk, conflicting source-of-truth assumptions, ambiguous ownership, ambiguous visibility, ambiguous auth, or unresolved product scope for Dive Memories.

## Stop Conditions

- Existing media schema cannot safely support `dive_site_id`.
- Media ownership or visibility cannot be identified.
- Dive Memories V1 scope is contradictory or absent.
- Current dirty worktree changes make discovery unreliable.

## Expected Report Output

- Discovered source-of-truth tables and fields.
- Recommended backend feature boundary for Dive Map.
- Decision on whether Dive Memories can proceed in V1.
- Exact blockers, if any, with the human decision required.

## Completion Notes

Filled by the execution skill or runner.
