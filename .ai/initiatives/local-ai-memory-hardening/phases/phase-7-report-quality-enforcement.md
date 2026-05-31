# Phase 7: Report Quality Enforcement

Status: passed

## Goal

Improve phase and final report requirements so reports remain useful, honest, and actionable.

## Scope

- `.ai/templates/execution-report-template.md`
- `.ai/templates/initiative-template.md` if needed
- `.ai/templates/phase-template.md` if needed
- `.codex/skills/project-memory-execution/SKILL.md`
- `tools/ai-runner/index.mjs` report generation
- `.ai/README.md`

## Out Of Scope

- No retroactive rewrite of all old reports.
- No application code.
- No dashboard or report UI.

## Inputs

- Assessment report quality findings.
- Existing phase/final reports as examples.

## Tasks

- Require exact commands run and exact failure excerpts.
- Require files changed and no-application-code confirmation where applicable.
- Require verification summary and skipped-command reasons.
- Require repairs attempted with attempt count.
- Require unrelated drift classification.
- Require state updates and decisions updates summary.
- Update runner-generated reports to match the template.
- Document report quality expectations in the execution skill.

## Verification Commands

- `rg -n "unrelated drift|exact command|files changed|repairs attempted|verification summary" .ai/templates .codex/skills tools/ai-runner .ai/README.md`
- `node tools/ai-runner/index.mjs --help`
- `git diff -- .ai/templates .ai/README.md .codex/skills tools/ai-runner`
- `git diff --check`

## Expected Evidence

- Templates and skills require high-signal reports.
- Runner-generated reports include the required sections.
- Unrelated drift classification is explicitly required.

## Repair Policy

Allowed repairs:

- template wording fixes.
- runner report formatting fixes.
- skill documentation fixes.

Hard-stop if report enforcement would require a reporting database or dashboard.

## Completion Notes

Completed on 2026-05-31.

- Strengthened report template requirements for exact commands, verification summaries, skipped-command reasons, files changed, repair attempts, unrelated drift, and state/decision updates.
- Updated project-memory-execution rules to require the same report evidence.
- Updated runner-generated phase and final reports to include stronger verification, changed-file, drift, and lifecycle-labeled risk sections.
