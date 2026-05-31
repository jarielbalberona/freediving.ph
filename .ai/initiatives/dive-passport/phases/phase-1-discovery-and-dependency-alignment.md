# Phase 1: Discovery And Dependency Alignment

Status: pending

## Objective

Identify whether Passport can be built as a read-only aggregate over existing source systems without creating reverse dependencies or source-data duplication.

## Goal

Establish the current profile, badge, Dive Map, Dive Journey, media, memory, auth, visibility, route, shared contract, and web profile patterns before implementation starts.

## Scope

- Read-only inspection of `services/fphgo`, `packages/types`, `apps/web`, `.ai/initiatives/user-dive-map`, and `.ai/initiatives/dive-journey`.
- Identify available child system contracts and safe fallback behavior.
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
- Do not implement missing child systems.
- Do not mark later phases complete.

## Dependencies

- `.ai/core/*`
- `.ai/state/*`
- `.ai/initiatives/dive-passport/00-overview.md`
- `.ai/initiatives/dive-passport/01-domain-model.md`
- `.ai/initiatives/user-dive-map/*`
- `.ai/initiatives/dive-journey/*`
- Existing files under `services/fphgo`, `packages/types`, and `apps/web`.

## Tasks

- Inspect profile aggregate/read conventions.
- Inspect Profile Badges backend/shared/web surfaces.
- Inspect whether Dive Map implementation or contracts exist.
- Inspect whether Dive Journey implementation or contracts exist.
- Inspect media and memory read surfaces.
- Inspect auth and visibility filtering conventions.
- Decide whether Passport should be its own backend feature package or a profile-owned aggregate service.
- Decide whether optional settings are low-risk enough for V1 or require product hard stop.
- Confirm no implementation path requires a `dive_passports` source-of-truth table.
- Confirm child dependencies remain one-way into Passport.
- Confirm fallback behavior for new user profiles.

## Verification Requirements

- This phase is read-only.
- The report must preserve enough evidence for contract/API phases to proceed without repeating discovery.

## Verification Commands

- `git status --short`
- `rg "badge|passport|journey|user_dive_sites|visibility|profile|media|memory" services/fphgo packages/types apps/web .ai/initiatives`
- `find services/fphgo/internal/features -maxdepth 2 -type d | sort`
- `find apps/web/src/features -maxdepth 2 -type d | sort`

## Expected Evidence

- Phase report names available child systems and missing dependencies.
- Phase report defines backend package boundary for Passport.
- Phase report states whether optional settings can proceed.
- Phase report names fallback behavior for missing Dive Map, Journey, Badges, memories, and media.
- Phase report confirms whether execution can proceed without creating Passport-owned source data.

## Repair Policy

Allowed repairs:

- None. This phase is read-only discovery.

Hard-stop instead of continuing if discovery finds unavailable/contradictory Dive Map or Journey contracts, ambiguous visibility rules, auth ambiguity, settings product ambiguity, or any need to duplicate child source data.

## Stop Conditions

- Dive Map or Dive Journey contracts are unavailable and no safe fallback exists.
- Child visibility rules are ambiguous.
- Optional settings require a product decision.
- Any implementation path requires source-data duplication or reverse dependency.

## Expected Report Output

- Available child systems and missing dependencies.
- Backend package boundary recommendation.
- Settings proceed/defer decision.
- Empty-state/fallback plan for every Passport section.
- Confirmation Passport can remain read-only.

## Completion Notes

Filled by the execution skill or runner.
