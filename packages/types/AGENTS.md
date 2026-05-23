# AGENTS.md (packages/types)

## Responsibility
`packages/types` owns shared TypeScript interfaces/types for web-facing API envelopes, DTOs, and pagination contracts.

## Structure And Where To Add Changes
- Add/update exported types in `src/index.ts`.
- Treat `src/index.ts` as the canonical location for shared API/request/response contracts.
- `apps/web` must not define feature-local `types.ts`; add those contracts here and import via `@freediving.ph/types`.
- Treat changes as cross-workspace contract updates; validate the web consumers and the matching `services/fphgo` route contracts together.

## Local Commands (Verified)
- `pnpm -C packages/types build`
- `pnpm -C packages/types type-check`
- `pnpm -C packages/types test`
