# Phase 3: Preflight Validation

Status: passed

## Goal

Add runner preflight validation before any phase execution.

## Scope

- `tools/ai-runner/index.mjs`
- `.ai/README.md`
- `.ai/templates/*`
- `.codex/skills/project-memory-execution/SKILL.md`
- initiative-local reports

## Out Of Scope

- No dependency support beyond a stub/placeholder if needed for Phase 4.
- No application verification.
- No destructive cleanup.

## Inputs

- Assessment report must-fix list.
- Current initiative structures.
- Runner status and phase ordering behavior after Phases 1 and 2.

## Tasks

- Add preflight checks for:
  - initiative exists
  - required files exist
  - phases directory exists
  - reports folder exists
  - initiative is locked and ready before execution
  - phase numbers are valid and sequential enough to execute safely
  - phase statuses are canonical
  - no later terminal phase appears after an earlier pending phase unless explicitly allowed
- Add `--check-only` or equivalent non-executing validation mode.
- Ensure dry-run does not bypass structural validation.
- Ensure errors are explicit and actionable.

## Verification Commands

- `node tools/ai-runner/index.mjs --help`
- `node tools/ai-runner/index.mjs local-ai-memory-hardening --check-only` if implemented
- `git diff -- tools/ai-runner .ai .codex/skills`
- `git diff --check`

## Expected Evidence

- Runner can validate initiative structure without invoking Codex.
- Unlocked/not-ready initiatives cannot execute.
- Missing required files produce clear errors.
- Reports folder requirement is enforced.

## Repair Policy

Allowed repairs:

- runner CLI argument handling fixes.
- preflight validation fixes.
- documentation/template alignment.
- formatting issues.

Hard-stop if preflight requires changing application code or if lock/readiness semantics are unclear.

## Completion Notes

Completed on 2026-05-31.

- Runner preflight now validates initiative existence, required files, reports folder, lock/readiness, phase numbering, phase status vocabulary, pending/terminal phase consistency, and dependencies.
- `--check-only` validates without invoking Codex or executing a phase.
- Dry-run now goes through preflight before prompt generation.
- Runner tests cover check-only behavior, missing required structures, lock/readiness validation, report folder validation, invalid statuses, and dependency blockers.
