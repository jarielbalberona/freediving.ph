# Phase 6: Risk Lifecycle Cleanup

Status: passed

## Goal

Define and apply a consistent lifecycle for known risks.

## Scope

- `.ai/state/known-risks.md`
- `.ai/README.md`
- `.ai/templates/execution-report-template.md`
- `.codex/skills/project-memory-execution/SKILL.md`
- `tools/ai-runner/index.mjs` if it writes risk entries

## Out Of Scope

- No application changes.
- No deletion of useful risk history without marking it resolved or superseded.
- No new product decisions.

## Inputs

- Assessment report risk lifecycle findings.
- Current `.ai/state/known-risks.md`.
- Completed initiative reports.

## Tasks

- Define risk lifecycle labels:
  - `active`
  - `accepted`
  - `resolved`
  - `superseded`
- Update `known-risks.md` to use the lifecycle labels or a clear equivalent structure.
- Mark stale risks resolved or superseded where later phase evidence clearly changed them.
- Keep unresolved risks active or accepted with reason.
- Update report template and execution skill to require risk lifecycle labels.

## Verification Commands

- `rg -n "active|accepted|resolved|superseded" .ai/state/known-risks.md .ai/README.md .ai/templates .codex/skills tools/ai-runner`
- `git diff -- .ai/state/known-risks.md .ai/README.md .ai/templates .codex/skills tools/ai-runner`
- `git diff --check`

## Expected Evidence

- Risk lifecycle is documented.
- `known-risks.md` distinguishes active risks from resolved/superseded history.
- Future reports have a place to classify risks.

## Repair Policy

Allowed repairs:

- risk label corrections.
- documentation/template corrections.
- runner risk output wording fixes.

Hard-stop if risk classification requires product decisions or uncertain inference.

## Completion Notes

Completed on 2026-05-31.

- Added canonical `active`, `accepted`, `resolved`, and `superseded` risk lifecycle labels.
- Reclassified stale known risks as resolved, accepted, or superseded where later phase evidence supported it.
- Updated report template, execution skill, `.ai/README.md`, and runner risk output to require lifecycle labels.
