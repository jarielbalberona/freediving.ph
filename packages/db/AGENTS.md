# AGENTS.md (packages/db)

## Responsibility
`packages/db` is the shared DB package boundary for workspace dependencies.

## Structure And Where To Add Changes
- Public exports live in `src/index.ts`.
- Drizzle schema/config currently lives in `apps/api` (`src/models/drizzle`, `drizzle.config.ts`), so DB model/migration changes are made there unless this package is intentionally expanded.

## Local Commands (Verified)
- `pnpm -C packages/db build`
- `pnpm -C packages/db type-check`
- `pnpm -C packages/db test`
- `pnpm -C packages/db db:generate`
- `pnpm -C packages/db db:migrate`
- `pnpm -C packages/db db:push`
- `pnpm -C packages/db db:studio`
