# AGENTS.md (apps/api)

## Responsibility
`apps/api` owns the Express API server, HTTP route wiring, middleware, and feature-domain handlers/services/validators.

## Structure And Where To Add Changes
- Feature modules: `src/app/<feature>/`
  - Add route handlers in `*.controller.ts`
  - Add business logic in `*.service.ts`
  - Add validation schemas/rules in `*.validator.ts` or `*.validators.ts`
  - Add feature router in `*.routes.ts`
- Route registration:
  - Feature routers are aggregated via `src/routes/app.routes.ts`
  - Mounted through `src/routes/routes.config.ts`
- Cross-cutting middleware/utilities:
  - Middleware: `src/middlewares/`
  - Utilities: `src/utils/`
  - Core env/constants/pagination/messages: `src/core/`
- DB model definitions: `src/models/drizzle/`
- Drizzle migrations output: `.drizzle/migrations/`
- Seeds: `src/seed/`

## Local Commands (Verified)
- `pnpm -C apps/api dev`
- `pnpm -C apps/api build`
- `pnpm -C apps/api lint`
- `pnpm -C apps/api type-check`
- `pnpm -C apps/api test`

DB commands:
- `pnpm -C apps/api db:generate`
- `pnpm -C apps/api db:migrate`
- `pnpm -C apps/api db:push`
- `pnpm -C apps/api db:studio`
- `pnpm -C apps/api db:seed`

## Visible Footguns
- `src/routes/routes.config.ts` writes `routes.json` when `NODE_ENV=development`; avoid committing unintended route map changes.
- Drizzle config points schema to `src/models/drizzle` in this workspace (not `packages/db`), so schema edits belong here.
