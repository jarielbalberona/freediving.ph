# Local AI Memory Hardening Cross-Module Data Flow

## Authoring Flow

1. Human request enters Codex.
2. `initiative-authoring` reads `.ai/core`, `.ai/state`, templates, and assessment findings.
3. Initiative files are written under `.ai/initiatives/local-ai-memory-hardening/`.
4. Human reviews and locks the initiative before execution.

## Execution Flow After V1.1

1. Runner receives an initiative key.
2. Runner performs preflight validation before invoking Codex.
3. Runner validates:
   - required initiative files
   - initiative lock/readiness
   - `depends_on`
   - phase numbering
   - phase statuses
   - reports folder
   - state consistency where feasible
4. Runner selects the first pending phase by numeric phase number.
5. `project-memory-execution` executes only that phase.
6. Phase report records commands, results, files changed, risks, repairs, and drift classification.
7. State files are updated through keyed initiative sections instead of noisy append-only fragments.
8. Runner stops on blocked/failed phases or completes final report when all phases are terminal.

## State Flow

- `00-overview.md`: initiative-level lifecycle and scope.
- `.ai/state/current-state.md`: current operational state and initiative summary.
- `.ai/state/known-risks.md`: active/accepted/resolved/superseded risks.
- `.ai/state/verification-status.md`: latest verified command evidence and final status.
- `.ai/state/decisions.md`: durable decisions only.

## Runner Flow

- Input: initiative key and optional flags.
- Reads: `.ai/README.md`, `.ai/core/*`, `.ai/state/*`, initiative files, phase files, templates, skills where relevant.
- Writes: phase statuses, phase reports, final report, state files.
- Must not write application code unless a future feature initiative explicitly executes application phases. This initiative itself is tooling-only.

## No Runtime Product Data Flow

This initiative must not affect product runtime behavior. It does not change backend APIs, frontend UI, shared runtime contracts, migrations, or production data models.
