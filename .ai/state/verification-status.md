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
- Verification status: completed/passed
- Notes: Final Dive Journey verification passed on 2026-05-31. Passed `cd services/fphgo && go test ./db/...`, `cd services/fphgo && make sqlc`, `cd services/fphgo && go test ./...`, `pnpm --filter @freediving.ph/types type-check`, `pnpm --filter @freediving.ph/types test`, `pnpm --filter @freediving.ph/web type-check`, `pnpm --filter @freediving.ph/web test`, `pnpm --filter @freediving.ph/web lint`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `git diff --stat`, and `git diff --check`.

### `dive-passport`

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Verification status: completed/pass with unrelated issue
- Notes: Final Dive Passport targeted verification passed on 2026-05-31. Passed `DB_DSN='postgres://postgres:postgres@localhost:5433/fph?sslmode=disable' pnpm migrate:go`, `DB_DSN='postgres://postgres:postgres@localhost:5433/fph_test?sslmode=disable' pnpm migrate:go`, `cd services/fphgo && go test ./internal/features/dive_passport/...`, `cd services/fphgo && go test ./internal/features/profiles/...`, `cd services/fphgo && go test ./internal/app/...`, `cd services/fphgo && go test ./db/...`, `cd services/fphgo && make sqlc`, `pnpm --filter @freediving.ph/types type-check`, `pnpm --filter @freediving.ph/types test`, `pnpm --filter @freediving.ph/web type-check`, `pnpm --filter @freediving.ph/web test`, `pnpm --filter @freediving.ph/web lint`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `git diff --stat`, and `git diff --check`. Repo-level `pnpm test` failed only in unrelated `apps/mobile` due dirty Expo dependency drift: `@expo/ui` is `~56.0.15` but the mobile foundation contract expects `~56.0.14`.

### `profile-experience-integration`

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Verification status: completed/pass with unrelated issue
- Notes: Final Profile Experience Integration verification passed on 2026-05-31 for targeted scope. Passed profile, Dive Map, Dive Journey, Dive Passport, app route, shared types, web type-check/test/lint, `pnpm test:go`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `git diff --stat`, and `git diff --check`. Repo-level `pnpm test` failed only in unrelated `apps/mobile` due dirty Expo dependency drift: `@expo/ui` is `~56.0.15` but the mobile foundation contract expects `~56.0.14`.
