# Local AI Memory Hardening Domain Model

## Core Concepts

### AI Memory V1

The repository-local markdown system under `.ai/`. It is the project memory and execution record for initiative planning, phase execution, verification evidence, and operational state.

### Initiative

A scoped unit of planned work under `.ai/initiatives/<initiative-key>/`. An initiative has overview, domain model, module sequence, data flow, verification plan, phases, and reports.

### Initiative Lifecycle

The lifecycle metadata that says whether an initiative is draft, locked, ready for execution, executing, blocked, failed, or complete. V1.1 must avoid conflicting lifecycle truth between `00-overview.md`, `.ai/state/current-state.md`, phase files, and final reports.

### Phase

A single executable unit under `phases/`. A phase must have one clear goal, explicit scope, verification commands, expected evidence, repair policy, hard stops, and completion notes.

### Canonical Phase Status

The only valid phase statuses after this initiative:

- `pending`
- `in_progress`
- `repairing`
- `passed`
- `passed_with_issues`
- `blocked`
- `failed`

`completed` and `done` are non-canonical aliases and must not remain as active phase status values unless the runner explicitly maps them during migration/preflight.

### Dependency

An initiative-level relationship declared with `depends_on`. A dependent initiative may not execute until dependencies are terminal and acceptable according to the dependency policy.

### Preflight

A runner validation step that checks structure, lifecycle, phase numbering, statuses, dependencies, reports folder, and required files before invoking Codex or executing a phase.

### Risk Lifecycle

Risk entries should have one of these lifecycle labels:

- `active`: unresolved and needs attention.
- `accepted`: known risk intentionally tolerated for now.
- `resolved`: no longer applies because work or verification removed it.
- `superseded`: replaced by a newer risk, decision, or implementation fact.

### Unrelated Drift

A working-tree or verification failure outside the active initiative scope. Reports must classify it explicitly and provide evidence before continuing.

### Runner Trust Boundary

The local runner can enforce file structure, ordering, status consistency, dependency checks, and command execution. It cannot prove product judgment unless tests and phase specs encode the rule.

## Non-Domain Concepts

- Application features.
- Product runtime data.
- V2 database/indexing infrastructure.
- Cross-project memory.
- Dashboards or web UI.
