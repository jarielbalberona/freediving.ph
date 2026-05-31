# Phase 1: Runner Correctness

Status: passed

## Goal

Fix runner correctness issues that can cause unsafe autonomous execution.

## Scope

- `tools/ai-runner/index.mjs`
- runner-focused documentation in `.ai/README.md` if needed
- runner verification notes under this initiative's reports

## Out Of Scope

- No application code.
- No state cleanup beyond what is needed to document runner behavior.
- No dependency support beyond preserving a path for later phases.

## Inputs

- `.ai/initiatives/local-ai-memory-hardening/reports/assessment-report.md`
- `tools/ai-runner/index.mjs`
- `.ai/README.md`
- `.ai/templates/phase-template.md`

## Tasks

- Replace lexical phase sorting with numeric phase ordering.
- Fail preflight on duplicate phase numbers.
- Fail preflight on missing or unparsable phase numbers.
- Ensure `phase-10-*` sorts after `phase-9-*`.
- Keep runner behavior local and markdown-first.
- Add or update runner self-checks if a tooling test boundary exists.

## Verification Commands

- `node tools/ai-runner/index.mjs --help`
- `git diff -- tools/ai-runner .ai/README.md .ai/initiatives/local-ai-memory-hardening`
- `git diff --check`

## Expected Evidence

- Phase ordering logic parses numeric phase prefixes.
- Duplicate, missing, or invalid phase numbers are rejected.
- Help output still works.
- Diff is limited to runner/workflow files.

## Repair Policy

Allowed repairs:

- JavaScript syntax/runtime failures in `tools/ai-runner`.
- documentation mismatch in runner behavior.
- formatting issues.

Hard-stop if correctness requires changing application code or adding non-local infrastructure.

## Completion Notes

Completed on 2026-05-31.

- Runner phase files now sort by parsed numeric phase number instead of lexical filename order.
- Duplicate, missing, or invalid phase numbers fail validation.
- `--check-only` preflight was added.
- Initiative lock/readiness, required files, reports folder, phase statuses, and dependency readiness are validated before execution.
- `FPH_AI_RUNNER_ROOT` was added for isolated runner tests.
- Dedicated runner tests were added and passed.
