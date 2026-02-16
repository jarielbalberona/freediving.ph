# AGENTS.md (packages/utils)

## Responsibility
`packages/utils` contains shared utilities/helpers for multiple workspaces.

## Structure And Where To Add Changes
- Add reusable helpers and exports in `src/index.ts`.
- Prefer pure, side-effect-free utilities unless explicitly required.

## Local Commands (Verified)
- `pnpm -C packages/utils build`
- `pnpm -C packages/utils type-check`
- `pnpm -C packages/utils test`
