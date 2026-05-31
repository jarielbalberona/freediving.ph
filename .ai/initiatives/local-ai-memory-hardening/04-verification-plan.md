# Local AI Memory Hardening Verification Plan

## Global Verification Rules

- Verify only AI memory, runner, skills, templates, and workflow files.
- Do not run emulator tests.
- Do not run device tests.
- Do not run browser UX smoke tests.
- Do not run destructive commands.
- Do not modify application code.
- Record exact commands and results in phase reports.
- If a broad repo command fails because unrelated application drift exists, classify it explicitly and run the narrowest tooling checks possible.

## Structure Verification

- `test -f .ai/initiatives/local-ai-memory-hardening/00-overview.md`
- `test -f .ai/initiatives/local-ai-memory-hardening/01-domain-model.md`
- `test -f .ai/initiatives/local-ai-memory-hardening/02-module-sequence.md`
- `test -f .ai/initiatives/local-ai-memory-hardening/03-cross-module-data-flow.md`
- `test -f .ai/initiatives/local-ai-memory-hardening/04-verification-plan.md`
- `test -d .ai/initiatives/local-ai-memory-hardening/phases`
- `test -d .ai/initiatives/local-ai-memory-hardening/reports`
- `find .ai/initiatives/local-ai-memory-hardening/phases -maxdepth 1 -type f | sort`

## Runner Verification

Use static and CLI checks where supported:

- `node tools/ai-runner/index.mjs --help`
- `node tools/ai-runner/index.mjs local-ai-memory-hardening --dry-run --once` only after the initiative is locked/ready or after preflight has a check-only mode that does not execute phases.
- Future V1.1 runner checks should include `--check-only` once implemented.

Expected evidence:

- Numeric phase ordering is proven by test or check output.
- Non-canonical statuses are rejected or normalized according to documented policy.
- Missing required files fail preflight.
- Missing/blocked dependencies fail preflight.
- Unlocked/not-ready initiatives fail execution preflight.

## Documentation Verification

- `rg -n "completed|done" .ai/README.md .ai/templates .codex/skills tools/ai-runner .ai/initiatives`
- `rg -n "depends_on|active|accepted|resolved|superseded|unrelated drift" .ai .codex/skills tools/ai-runner`

Expected evidence:

- Canonical status vocabulary is documented consistently.
- Risk lifecycle labels are documented.
- Unrelated drift reporting is documented.
- `depends_on` is documented and validated.

## State Verification

- Check `.ai/state/current-state.md` has no stale `Next execution target` markers for completed initiatives.
- Check `.ai/state/known-risks.md` uses lifecycle labels or an equivalent structured convention.
- Check `.ai/state/verification-status.md` reflects current initiative status and command evidence.
- Check `.ai/state/decisions.md` only contains durable decisions.

## Final Verification

- `git diff -- .ai .codex/skills tools/ai-runner`
- `git diff --check`

Do not require repo-level application type-check, lint, test, or build for this tooling-only initiative unless runner changes add their own test command.

## Hard Stop Verification Failures

Stop instead of repairing if verification reveals:

- application code changed
- destructive command required
- runner would execute phases out of order
- dependency semantics are ambiguous
- status migration would erase history
- V2 infrastructure would be required to pass V1.1
