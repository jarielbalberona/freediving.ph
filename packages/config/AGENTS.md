# AGENTS.md (packages/config)

## Responsibility
`packages/config` contains shared config constants consumed by app workspaces.

## Structure And Where To Add Changes
- Public exports live in `src/index.ts`.
- Keep exports environment-agnostic and reusable across API/web.

## Local Commands (Verified)
- `pnpm -C packages/config build`
- `pnpm -C packages/config type-check`
- `pnpm -C packages/config test`
