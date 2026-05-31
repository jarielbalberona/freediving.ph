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

## Phase Lifecycle

Supported statuses:

- `pending`: not started.
- `in_progress`: currently executing.
- `repairing`: execution or verification failed and repair is being attempted.
- `passed`: verification passed with no known residual issue.
- `passed_with_issues`: phase completed but documented non-blocking risks remain.
- `blocked`: hard stop encountered; human decision required.
- `failed`: attempts exhausted or unrecoverable execution failure.

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

1. Load `.ai/core/*`, `.ai/state/*`, and the selected initiative.
2. Find the first phase with status `pending`.
3. Execute only that phase.
4. Run that phase's verification commands.
5. Attempt bounded repair when verification fails.
6. Write a phase report.
7. Update state files.
8. Move to the next phase until the initiative completes or hits a hard stop.

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
