# 01 Setup and Build Stability

Status: Completed (baseline stabilized)

## Issues

- Workspace checks are not green end-to-end from root (`lint`, `typecheck`, `build`).
- Web lint/build currently depend on fetching missing Next.js SWC binaries at runtime.
- API build fails with missing optional Rollup native package (`@rollup/rollup-darwin-arm64`).
- There is no test script coverage baseline across workspaces.
- App-level README/setup instructions are inconsistent with actual monorepo workflow.

## Fix

- Standardize local setup steps in root docs:
  - required Node and pnpm versions
  - install command
  - deterministic verification commands in order
- Ensure optional native dependencies are consistently installed for supported dev environments.
- Add a preflight script/checklist to validate:
  - dependency install state
  - required env files present
  - workspace command health
- Define a minimum CI-quality gate:
  - root `typecheck`
  - root `lint`
  - root `build`
- Add baseline `test` scripts (or explicit `no-tests-yet` placeholders) per workspace for consistency.

## Expectations

- A new contributor can clone, install, and run all core checks without hidden steps.
- `pnpm lint`, `pnpm typecheck`, and `pnpm build` are reliable and reproducible.
- Setup docs reflect current project reality, not templates or outdated assumptions.
- Failures are actionable and tied to explicit setup requirements.
