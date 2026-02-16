# AGENTS.md (packages/types)

## Responsibility
`packages/types` owns shared TypeScript interfaces/types (API envelopes, DTOs, pagination contracts).

## Structure And Where To Add Changes
- Add/update exported types in `src/index.ts`.
- Treat changes as cross-workspace contract updates; validate API + web consumers together.

## Local Commands (Verified)
- `pnpm -C packages/types build`
- `pnpm -C packages/types type-check`
- `pnpm -C packages/types test`
