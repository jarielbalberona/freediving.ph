# AGENTS.md (packages/types)

## Responsibility
`packages/types` owns shared TypeScript interfaces/types (API envelopes, DTOs, pagination contracts) consumed by both `apps/api` and `apps/web`.

## Structure And Where To Add Changes
- Add/update exported types in `src/index.ts`.
- Treat `src/index.ts` as the canonical location for shared API/request/response contracts.
- `apps/web` must not define feature-local `types.ts`; add those contracts here and import via `@freediving.ph/types`.
- Treat changes as cross-workspace contract updates; validate API + web consumers together.

## Local Commands (Verified)
- `pnpm -C packages/types build`
- `pnpm -C packages/types type-check`
- `pnpm -C packages/types test`
