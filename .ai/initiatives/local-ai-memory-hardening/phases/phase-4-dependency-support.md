# Phase 4: Dependency Support

Status: passed

## Goal

Add markdown-first initiative dependency support through `depends_on`.

## Scope

- `.ai/README.md`
- `.ai/templates/initiative-template.md`
- `.codex/skills/initiative-authoring/SKILL.md`
- `.codex/skills/project-memory-execution/SKILL.md`
- `tools/ai-runner/index.mjs`
- initiative metadata examples or docs

## Out Of Scope

- No graph database.
- No external orchestration.
- No multi-project dependency resolver.
- No application code.

## Inputs

- Completed profile experience initiative sequence.
- Assessment finding that dependencies lived in prompts, not runner validation.

## Tasks

- Define `depends_on` syntax for initiative metadata.
- Define acceptable dependency terminal states.
- Add runner validation for missing, blocked, failed, or not-ready dependencies.
- Detect simple dependency cycles if feasible within V1.
- Update authoring skill to ask for dependencies during initiative creation.
- Update execution skill to check dependency readiness before execution.

## Verification Commands

- `node tools/ai-runner/index.mjs --help`
- `node tools/ai-runner/index.mjs local-ai-memory-hardening --check-only` if implemented
- `rg -n "depends_on" .ai .codex/skills tools/ai-runner`
- `git diff -- .ai .codex/skills tools/ai-runner`
- `git diff --check`

## Expected Evidence

- `depends_on` is documented.
- Runner validates dependencies before execution.
- Skills require dependency awareness.
- No external system is introduced.

## Repair Policy

Allowed repairs:

- metadata parser fixes.
- dependency validation fixes.
- documentation alignment.
- formatting issues.

Hard-stop if dependency semantics require a broader workflow decision.

## Completion Notes

Completed on 2026-05-31.

- `depends_on` syntax is documented for initiatives.
- Runner validates dependency existence, required files, phase statuses, terminal completion, blocked/failed state, and final reports.
- Runner tests cover satisfied and blocked dependency behavior.
- Initiative authoring and execution skills now require dependency awareness.
