# AGENTS.md (packages/db)

## Responsibility
`packages/db` is the shared TypeScript DB schema/helper boundary. It is not the migration authority.

## Structure And Where To Add Changes
- Public exports live in `src/index.ts`.
- Production schema and migrations live in `services/fphgo/db/schema` and `services/fphgo/db/migrations`.

## Local Commands (Verified)
- `pnpm -C packages/db build`
- `pnpm -C packages/db type-check`
- `pnpm -C packages/db test`
