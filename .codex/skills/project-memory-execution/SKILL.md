---
name: project-memory-execution
description: Execute one phase of a Freediving Philippines .ai initiative using repo-local memory, bounded verification, self-repair, reports, and state updates. Use when running or resuming initiative phases from .ai/initiatives.
---

# Project Memory Execution

Use this skill to execute exactly one initiative phase. The local runner may call this skill repeatedly, but each invocation must stay inside the active phase.

## Read First

- `AGENTS.md`
- `.ai/README.md`
- `.ai/core/*`
- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`
- `.ai/state/decisions.md`
- `.ai/initiatives/<initiative-key>/00-overview.md`
- `.ai/initiatives/<initiative-key>/04-verification-plan.md`
- active phase file

## Execution Rules

- Before execution, confirm the initiative is locked, ready for execution, structurally complete, and dependency-ready. If `depends_on` is declared, every dependency must be complete, unblocked, unfailed, and have a final report.
- Execute the current phase only.
- Do not expand scope to later phases.
- Do not modify `.ai/core/*` unless the user explicitly asks.
- Preserve unrelated dirty worktree changes.
- Update `current-state.md`, `known-risks.md`, and `verification-status.md` for every phase.
- Update `decisions.md` only when a durable project decision is made.
- Write a phase report under `.ai/initiatives/<initiative-key>/reports/`.
- Treat initiative `00-overview.md` as the durable owner of lifecycle metadata. Treat phase files as the owner of phase status and phase reports as the owner of execution evidence.
- Do not leave stale `Next execution target` or contradictory `Execution started` metadata after an initiative completes.
- When updating repeated state sections for the same phase, replace the keyed section instead of appending duplicate historical copies.
- Every risk entry must use one lifecycle label: `active`, `accepted`, `resolved`, or `superseded`.

## Status Handling

Set the active phase status as work proceeds:

- `in_progress` when starting.
- `repairing` while attempting allowed repairs.
- `passed` when verification passes cleanly.
- `passed_with_issues` when the phase is usable but non-blocking risks remain.
- `blocked` when a hard stop needs human input.
- `failed` when repair attempts are exhausted or execution is unrecoverable.

Do not use `completed` or `done`. A completed successful phase is `passed` or `passed_with_issues`.

## Verification

Run the commands listed in the phase file unless they are impossible in the current environment. Record exact command outcomes in the report and in `.ai/state/verification-status.md`.

Do not run emulators unless the phase explicitly allows it.

## Self-Repair

Allowed repair categories:

- type-check failures
- lint failures
- build failures
- missing imports
- formatting issues
- generated file drift
- minor contract mismatches inside the active phase

Default limit: three repair attempts. No infinite loops. If the same failure persists after the limit, set status `failed`.

## Hard Stops

Set status `blocked` and stop for:

- security ambiguity
- authentication ambiguity
- privacy ambiguity
- destructive migration risk
- conflicting specifications
- required product decision
- required UX decision
- required human validation
- scope expansion beyond phase
- same failure after max retries

The report must include the exact blocker and the decision needed.

## Report Requirements

Every phase report must include:

- final status
- summary of changes
- files changed
- no-application-code confirmation when the initiative is tooling-only
- verification summary with pass/fail/skipped counts
- exact command strings run and exact failure excerpts
- skipped commands with reasons and impact
- repairs attempted with attempt number, failure cause, repair made, and result
- unrelated drift classification
- state files updated
- decisions updates or explicit statement that no decision update was made
- risks and limitations with lifecycle labels: `active`, `accepted`, `resolved`, or `superseded`
- next phase readiness

At initiative completion, create `reports/final-report.md` with:

- Initiative Summary
- Completed Phases
- Verification Results
- Risks
- Known Limitations
- Recommended Follow-Up Work
- Final Verdict: `PASS`, `PASS WITH ISSUES`, or `FAIL`
