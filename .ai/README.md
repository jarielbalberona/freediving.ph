# Freediving Philippines AI Memory

This directory is the local source of truth for AI-assisted planning and execution inside this repository. It is markdown-first by design. Do not bolt on databases, embeddings, vector stores, dashboards, or cloud orchestration for V1.

## Memory Hierarchy

- `core/`: durable project context. These files describe the product, architecture, conventions, and domain model. Agents must read the relevant files before planning or executing work. Do not edit these files automatically during phase execution.
- `state/`: operational project state. Phase execution must update `current-state.md`, `known-risks.md`, and `verification-status.md`. Update `decisions.md` only when a durable decision is made.
- `initiatives/`: one folder per initiative. Each initiative contains an overview, domain model, phase plan, data flow, verification plan, phase files, and reports.
- `templates/`: canonical templates for initiatives, phases, reports, and decisions.

## Initiative Lifecycle

1. A human writes a feature or technical objective.
2. The initiative authoring skill converts it into `.ai/initiatives/<initiative-key>/`.
3. The human reviews the plan at the initiative level, not between every phase.
4. The runner executes phases in order.
5. Each phase writes a report and updates project state.
6. Completion produces `reports/final-report.md`.

## Initiative Dependencies

Initiatives may declare dependencies in `00-overview.md` using:

```text
depends_on: other-initiative, another-initiative
```

Use `depends_on: []` or omit the field when there are no dependencies.

The runner must not execute an initiative until every dependency:

- exists under `.ai/initiatives/`
- has valid required files and phase statuses
- has all phases in terminal status
- has no `blocked` or `failed` phase
- has `reports/final-report.md`

## Phase Lifecycle

Canonical statuses:

- `pending`: not started.
- `in_progress`: currently executing.
- `repairing`: execution or verification failed and repair is being attempted.
- `passed`: verification passed with no known residual issue.
- `passed_with_issues`: phase passed but documented non-blocking risks remain.
- `blocked`: hard stop encountered; human decision required.
- `failed`: attempts exhausted or unrecoverable execution failure.

Non-canonical statuses are forbidden in active phase files. In particular:

- Do not use `completed`.
- Do not use `done`.

Historical completion should be represented as `passed` or `passed_with_issues` with completion notes and reports preserving the evidence.

Allowed transitions:

- `pending` -> `in_progress`
- `in_progress` -> `passed`
- `in_progress` -> `passed_with_issues`
- `in_progress` -> `repairing`
- `in_progress` -> `blocked`
- `repairing` -> `in_progress`
- `repairing` -> `passed`
- `repairing` -> `passed_with_issues`
- `repairing` -> `failed`
- `repairing` -> `blocked`
- `failed` -> `repairing` only when a human explicitly resumes with new context
- `blocked` -> `pending` or `in_progress` only after the blocker is resolved and documented

## Execution Lifecycle

The local runner must:

1. Run preflight validation before invoking Codex.
2. Confirm the initiative exists, is locked, and is ready for execution.
3. Confirm required initiative files, phases, reports folder, phase numbering, phase statuses, and dependencies are valid.
4. Load `.ai/core/*`, `.ai/state/*`, and the selected initiative.
5. Find the first phase with status `pending` by numeric phase order.
6. Execute only that phase.
7. Run that phase's verification commands.
8. Attempt bounded repair when verification fails.
9. Write a phase report.
10. Update state files.
11. Move to the next phase until the initiative completes or hits a hard stop.

Use `pnpm ai:run <initiative-key> -- --check-only` to run preflight validation without invoking Codex or executing a phase.

## State Lifecycle

- Initiative `00-overview.md` owns durable lifecycle metadata: locked status, execution readiness, dependency list, execution started flag, and final-report pointer.
- Phase files own per-phase status.
- Phase reports own execution evidence.
- `.ai/state/current-state.md` is the live cross-initiative summary. It must not contradict initiative overviews or retain stale execution targets after completion.
- `.ai/state/verification-status.md` is the live verification summary. Exact command evidence still belongs in phase reports.
- Runner-managed state sections must be keyed and replaced by heading when rerun. Do not create repeated append-only sections for the same phase.

## Risk Lifecycle

Every entry in `.ai/state/known-risks.md` must use one lifecycle label:

- `active`: unresolved and must be considered before related execution.
- `accepted`: known and intentionally tolerated for now with a reason.
- `resolved`: no longer open because later work fixed or verified it.
- `superseded`: replaced by a later rule, initiative, or implementation boundary.

Do not delete useful risk history just because it stopped being active. Reclassify it as `resolved` or `superseded` with the evidence that changed the status.

## Report Quality

Every phase report must include:

- exact command strings that were run
- verification summary with pass/fail/skipped counts
- exact failure excerpts for failed commands
- skipped-command reasons and impact
- files changed
- no-application-code confirmation for tooling-only initiatives
- repair attempts with attempt count, failure cause, repair made, and result
- unrelated drift classification
- state updates and decisions updates
- risks and limitations using risk lifecycle labels

## Repair Lifecycle

Self-repair is allowed for narrow, code-wise failures:

- type-check failures
- lint failures
- build failures
- missing imports
- formatting issues
- generated file drift
- minor contract mismatches inside the active phase scope

Default repair limit is three attempts. Infinite loops are forbidden. If the same failure persists after the retry limit, mark the phase `failed` and stop.

## Hard-Stop Lifecycle

Stop immediately and mark the phase `blocked` for:

- security ambiguity
- authentication ambiguity
- privacy ambiguity
- destructive migration risk
- conflicting specifications
- required product decision
- required UX decision
- required human validation
- scope expansion beyond the current phase
- same failure after max retries

The report must name the blocker, cite the phase requirement that triggered it, and list the exact human decision needed.

## Future V2 Architecture

V2 can consider richer indexing, cross-project memory, dashboards, or external orchestration only after V1 proves that plain repository files, disciplined phase specs, and bounded execution produce useful results. Until then, adding infrastructure is premature complexity.
