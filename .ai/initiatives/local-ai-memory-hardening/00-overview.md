# Local AI Memory Hardening

## Initiative Key

`local-ai-memory-hardening`

## Initiative Status

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Authored date: 2026-05-31
- Source assessment: `.ai/initiatives/local-ai-memory-hardening/reports/assessment-report.md`

depends_on: []

## Objective

Harden the repository-local AI memory and autonomous execution workflow after the completed `user-dive-map`, `dive-journey`, `dive-passport`, and `profile-experience-integration` initiatives.

This initiative fixes workflow infrastructure only: `.ai` memory conventions, templates, state lifecycle, risk lifecycle, Codex skill rules, and `tools/ai-runner`. It must make the V1 markdown workflow safer and more consistent without adding application features or V2 retrieval infrastructure.

## Scope

- `.ai/README.md`
- `.ai/core/*`
- `.ai/state/*`
- `.ai/templates/*`
- `.ai/initiatives/*` metadata/status cleanup only where required for consistency
- `.codex/skills/initiative-authoring/*`
- `.codex/skills/project-memory-execution/*`
- `tools/ai-runner/*`
- Initiative-local reports under `.ai/initiatives/local-ai-memory-hardening/reports/`

## Explicit Non-Goals

- Do not implement application features.
- Do not modify backend product code.
- Do not modify frontend product code.
- Do not modify shared API contracts for runtime application behavior.
- Do not modify migrations or generated application database schema.
- Do not modify application tests except tests for the AI runner if they exist or are introduced under a tooling-only boundary.
- Do not implement Postgres, pgvector, vector databases, retrieval systems, embeddings, dashboards, web UI, cloud services, multi-project support, OpenClaw integration, or Paperclip integration.
- Do not start execution phases during initiative authoring.

## Acceptance Criteria

- Runner phase ordering cannot execute `phase-10` before `phase-2`.
- Runner and documentation share one canonical phase status vocabulary.
- Existing non-canonical phase statuses are normalized or explicitly supported.
- Runner preflight validates initiative existence, lock/readiness, required files, phase numbering, phase status, report folder, and dependency readiness before execution.
- Initiative metadata supports `depends_on` between initiatives.
- State files do not retain stale execution targets or stale lifecycle metadata after initiative completion.
- Risks can be labeled consistently as `active`, `accepted`, `resolved`, or `superseded`.
- Report templates require exact commands, exact failures, files changed, verification summaries, repairs, and unrelated drift classification.
- Codex skills clearly define preflight, status, dependency, risk, and unrelated-drift rules.
- Verification can prove the initiative structure and runner behavior without touching application code.
- Final report states whether V1.1 is safe for the next FPH initiative and whether V2 database/indexing is still unjustified.

## Domain Model

See `01-domain-model.md`.

## Module Sequence

See `02-module-sequence.md`.

## Cross-Module Data Flow

See `03-cross-module-data-flow.md`.

## Verification Plan

See `04-verification-plan.md`.

## Hard Stops

- Any phase requires changing backend, frontend, shared runtime contracts, migrations, or application feature tests.
- Any phase attempts to add V2 database/indexing/retrieval/cloud infrastructure.
- Canonical status vocabulary cannot be reconciled with existing completed initiative files without destructive loss of execution history.
- Dependency validation semantics are ambiguous enough to require a product/workflow decision.
- Runner changes would execute commands destructively or outside reviewed initiative scope.
- State cleanup would erase useful historical evidence instead of marking it resolved/superseded.
- Repeated verification failures persist after bounded repair.

## Execution Readiness

This initiative was explicitly approved for execution on 2026-05-31.
