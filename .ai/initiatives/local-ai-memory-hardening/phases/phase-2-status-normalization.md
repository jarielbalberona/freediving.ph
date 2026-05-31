# Phase 2: Status Normalization

Status: passed

## Goal

Standardize phase and initiative status vocabulary across `.ai`, skills, templates, and runner behavior.

## Scope

- `.ai/README.md`
- `.ai/templates/*`
- `.codex/skills/initiative-authoring/SKILL.md`
- `.codex/skills/project-memory-execution/SKILL.md`
- `tools/ai-runner/index.mjs`
- `.ai/initiatives/*/phases/*.md` status metadata only

## Out Of Scope

- No report rewriting except documenting status normalization if needed.
- No application code.
- No feature scope changes.

## Inputs

- Assessment finding: `completed` appears despite runner not accepting it.
- Existing completed initiative phase files.
- `.ai/README.md` status lifecycle.

## Tasks

- Define canonical phase statuses:
  - `pending`
  - `in_progress`
  - `repairing`
  - `passed`
  - `passed_with_issues`
  - `blocked`
  - `failed`
- Decide and document whether `completed` is rejected or migrated to `passed`.
- Normalize existing non-canonical phase statuses without deleting completion evidence.
- Update templates and skills to forbid `completed` and `done` as phase statuses.
- Update runner validation to provide actionable status errors.

## Verification Commands

- `rg -n "^Status: (completed|done)\\b" .ai/initiatives .ai/templates .ai/README.md .codex/skills tools/ai-runner || true`
- `node tools/ai-runner/index.mjs --help`
- `git diff -- .ai .codex/skills tools/ai-runner`
- `git diff --check`

## Expected Evidence

- No active phase file uses `Status: completed` or `Status: done`.
- Canonical vocabulary is documented once and referenced consistently.
- Runner accepts only canonical statuses or explicitly maps legacy values before failing.

## Repair Policy

Allowed repairs:

- metadata-only status corrections.
- template wording fixes.
- runner status parser fixes.
- formatting issues.

Hard-stop if status normalization would obscure whether a phase passed, failed, or passed with issues.

## Completion Notes

Completed on 2026-05-31.

- Existing `Status: completed` phase metadata was migrated to `Status: passed`.
- `.ai/README.md`, templates, and Codex skills now forbid `completed` and `done`.
- Runner preflight rejects `completed`, `done`, and unknown statuses with explicit errors.
- Runner tests cover valid, invalid, and legacy status behavior.
