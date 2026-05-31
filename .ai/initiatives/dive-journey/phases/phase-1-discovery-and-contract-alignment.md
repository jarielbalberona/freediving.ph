# Phase 1: Discovery And Contract Alignment

Status: passed

## Objective

Lock down the actual repository boundaries and unresolved risks before any Dive Journey implementation changes code.

## Goal

Establish the current profile, media, auth, visibility, follower, route, sqlc, shared contract, and web UI patterns for Journey implementation.

## Scope

- Read-only inspection of `services/fphgo`, `packages/types`, `apps/web`, and `.ai/initiatives/user-dive-map`.
- Identify current visibility and ownership conventions.
- Identify exact package boundaries and tests to modify in later phases.
- Write findings into the phase report.

## Out Of Scope

- No application code changes.
- No migrations.
- No contracts.
- No UI changes.
- No execution of later phases.

## Non-Goals

- Do not decide product behavior by guesswork.
- Do not normalize backend/frontend code.
- Do not mark later phases complete.

## Dependencies

- `.ai/core/*`
- `.ai/state/*`
- `.ai/initiatives/dive-journey/00-overview.md`
- `.ai/initiatives/dive-journey/01-domain-model.md`
- `.ai/initiatives/user-dive-map/*`
- Existing files under `services/fphgo`, `packages/types`, and `apps/web`.

## Tasks

- Inspect profile, media, auth, route, and shared contract patterns.
- Inspect whether a follower model exists and whether `followers` visibility is implementable.
- Inspect existing hide/delete/archive conventions.
- Inspect whether tagged-user support has reusable backend and web patterns.
- Inspect whether profile UI has an existing timeline-like section to reuse.
- Decide whether Journey should be a new backend feature package or extend an existing boundary.
- Confirm that the plan does not conflict with `user-dive-map`.
- Confirm shared/tagged memories cannot unlock locations through Journey.
- Confirm follower visibility support or identify the required product fallback decision.

## Verification Requirements

- This phase is read-only.
- The report must preserve enough evidence for schema/API phases to proceed without repeating discovery.

## Verification Commands

- `git status --short`
- `rg "visibility|followers|follow|archive|hide|delete|tagged|media" services/fphgo packages/types apps/web`
- `find services/fphgo/internal/features -maxdepth 2 -type d | sort`
- `find apps/web/src/features -maxdepth 2 -type d | sort`

## Expected Evidence

- Phase report names the exact ownership, visibility, follower, hide/delete, and tagged-user patterns discovered.
- Phase report names the implementation package boundaries for later phases.
- Phase report states whether `followers` visibility is implementable or a hard stop.
- Phase report confirms whether Journey can proceed without violating `user-dive-map`.

## Repair Policy

Allowed repairs:

- None. This phase is read-only discovery.

Hard-stop instead of continuing if discovery finds ambiguous visibility, ambiguous ownership, missing follower model required for `followers` visibility, auth ambiguity, destructive migration risk, or conflict with `user-dive-map`.

## Stop Conditions

- Missing follower model with no product-approved fallback.
- Ambiguous auth, ownership, or visibility behavior.
- Conflict with `user-dive-map` proof rules.
- Current dirty worktree changes make discovery unreliable.

## Expected Report Output

- Discovered ownership, visibility, follower, hide/delete, and tagged-user patterns.
- Recommended Journey backend boundary.
- Statement on `followers` visibility support or required fallback decision.
- Statement that Journey can proceed without creating map ownership.

## Completion Notes

Completed on 2026-05-31.

- Existing follower behavior is implementable through `saved_users`, which backs profile follower/following counts and the web Follow action.
- Journey should use a new `services/fphgo/internal/features/dive_journey` backend package.
- Tagged-user support has no existing acceptance/privacy policy; it must stay conditional and cannot grant proof, ownership, or map unlock behavior.
- Journey can proceed without violating User Dive Map because no Journey write will touch `user_dive_sites`.
