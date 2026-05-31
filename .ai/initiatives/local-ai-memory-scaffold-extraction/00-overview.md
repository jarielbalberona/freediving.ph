# Local AI Memory Scaffold Extraction

## Initiative Key

`local-ai-memory-scaffold-extraction`

## Dependencies

depends_on: local-ai-memory-hardening

## Initiative Status

- Status: passed
- Ready for execution: yes
- Execution started: yes
- Latest execution status: completed on 2026-06-01. The reusable scaffold was created outside the FPH app repo at `/Volumes/Files/softwareengineering/my-projects/local-ai-memory-scaffold`.

## Objective

Extract the proven V1/V1.1 local AI memory and autonomous Codex execution workflow into a reusable scaffold that can be installed into other project repositories with minimal manual work.

## Why This Exists

The FPH `.ai` system proved that markdown-first memory, locked initiatives, numeric phase execution, hard stops, bounded self-repair, and evidence-heavy reports reduce chaotic AI implementation loops. Keeping that system trapped in one repo is wasteful. The scaffold makes it repeatable without copying FPH product assumptions.

## What Was Extracted

- Generic `.ai` hierarchy.
- Generic `.ai/core/*` starter files.
- Generic `.ai/state/*` starter files.
- Generic `.ai/templates/*`.
- Generic `initiative-authoring` skill.
- Generic `project-memory-execution` skill.
- Generic `tools/ai-runner/index.mjs`.
- Generic `tools/ai-runner/index.test.mjs`.
- Package script guidance.
- Setup documentation.
- A sample initiative for smoke testing.
- Installer behavior for placeholder replacement, package-manager detection, overwrite protection, package script mutation, and post-install verification output.

## What Was Intentionally Excluded

- Freediving Philippines product rules, domain entities, route names, API modules, migration facts, and verification history.
- Any FPH application code.
- Any V2 database, vector, embeddings, dashboard, or cross-repo indexing implementation.
- Browser, device, and emulator verification.
- Automatic extraction of target-project domain rules. Humans still need to customize `.ai/core/*`.

## Scaffold Location

`/Volumes/Files/softwareengineering/my-projects/local-ai-memory-scaffold`

## Importing.ph Usage

```bash
node /Volumes/Files/softwareengineering/my-projects/local-ai-memory-scaffold/bin/scaffold-local-ai-memory.mjs \
  --target /Volumes/Files/softwareengineering/my-projects/importing.ph \
  --project-name "Importing.ph" \
  --project-key importing-ph \
  --write-package-scripts
```

## Verification Plan

- `node /Volumes/Files/softwareengineering/my-projects/local-ai-memory-scaffold/bin/scaffold-local-ai-memory.mjs --help`
- Scaffold into a temporary repository under `/tmp`.
- Verify generated `.ai`, `.codex`, and `tools/ai-runner` files exist.
- Run generated runner tests inside the temp project.
- Run syntax checks on scaffold JavaScript files.

## Final Verdict

PASS
