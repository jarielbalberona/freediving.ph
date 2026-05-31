# Local AI Memory Hardening Module Sequence

## Phase 1: Runner Correctness

Fix the runner's most dangerous correctness issues first:

- numeric phase ordering
- phase status parsing
- lifecycle validation foundation

This must happen before adding more validation layers.

## Phase 2: Status Normalization

Standardize status vocabulary across:

- `.ai/README.md`
- `.ai/templates/*`
- `.codex/skills/*`
- existing completed initiative phase files where safe
- runner status parser and generated reports

This phase removes ambiguity between `completed`, `passed`, and `done`.

## Phase 3: Preflight Validation

Add a non-executing validation path before any runner execution:

- initiative exists
- required files exist
- reports folder exists
- phase numbering is valid
- phase statuses are valid
- report structure expectations are satisfiable
- initiative lock/readiness is valid

## Phase 4: Dependency Support

Add initiative dependency metadata and runner checks for `depends_on`. Dependency support must remain markdown-first and local.

## Phase 5: State Lifecycle Cleanup

Normalize operational state handling:

- remove stale execution targets
- keep current-state initiative sections accurate
- define when overview metadata must update
- avoid append-only state noise from runner updates

## Phase 6: Risk Lifecycle Cleanup

Introduce and apply risk lifecycle labels:

- active
- accepted
- resolved
- superseded

Do not delete useful historical evidence; mark it accurately.

## Phase 7: Report Quality Enforcement

Strengthen templates, skills, and runner report output so every phase report includes:

- exact commands run
- exact failure excerpts
- files changed
- verification summary
- repairs attempted
- unrelated drift classification
- next phase readiness

## Phase 8: Final Verification

Run tooling-only verification, review final diff, write the final report, and decide whether V1.1 is ready for future FPH initiatives.

## Ordering Rule

Phases must execute in numeric order. Do not execute dependency support, state cleanup, or risk cleanup before runner phase ordering and status handling are corrected.
