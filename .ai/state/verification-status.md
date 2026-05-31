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
- Execution started: yes
- Verification status: completed/passed
- Notes: Final verification passed on 2026-05-31. Passed targeted checks, full Go checks, shared type checks/tests, web type-check/test/lint, repo-level `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `git diff --check`. Final report is `.ai/initiatives/user-dive-map/reports/final-report.md`.

### `dive-journey`

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Verification status: Phase 9 passed
- Notes: Phase 9 passed on 2026-05-31. Passed `cd services/fphgo && TEST_DB_DSN=postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable go test ./internal/features/dive_journey/...`, `pnpm --filter @freediving.ph/types type-check`, `git diff --name-only | rg 'dive_passport|dive-passport|passport' || true`, and `git diff --check`.

### `dive-passport`

- Status: locked
- Ready for execution: yes
- Execution started: no
- Verification status: not run
- Notes: Initiative authoring review completed. No implementation phase has started, and no app/runtime smoke tests were run. Future execution must follow `.ai/initiatives/dive-passport/04-verification-plan.md` and record exact command evidence in phase reports.

### `profile-experience-integration`

- Status: locked
- Ready for execution: yes
- Execution started: no
- Verification status: not run
- Notes: Initiative authoring review completed. No implementation phase has started, and no app/runtime smoke tests were run. Future execution must follow `.ai/initiatives/profile-experience-integration/04-verification-plan.md` and record exact command evidence in phase reports.
