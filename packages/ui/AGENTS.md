# AGENTS.md (packages/ui)

## Responsibility
`packages/ui` is the shared UI package boundary for reusable components.

## Structure And Where To Add Changes
- Export shared UI modules from `src/index.ts`.
- Keep package output dependency-safe for React 19 peer dependencies.

## Local Commands (Verified)
- `pnpm -C packages/ui build`
- `pnpm -C packages/ui type-check`
- `pnpm -C packages/ui test`
