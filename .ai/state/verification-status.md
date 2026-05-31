# Verification Status

Global verification status is unknown until a phase runs checks.

Baseline commands available from the root:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm preflight`

Phase reports must record exact commands, pass/fail status, and relevant failure output. Do not claim repository health from memory.

## Initiative Verification Readiness

### `user-dive-map`

- Status: locked
- Ready for execution: yes
- Execution started: no
- Verification status: not run
- Notes: Initiative authoring review completed. No implementation phase has started, and no app/runtime smoke tests were run. Future execution must follow `.ai/initiatives/user-dive-map/04-verification-plan.md` and record exact command evidence in phase reports.
