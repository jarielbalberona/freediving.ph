# AGENTS.md

## Monorepo Map
- `apps/api`: Legacy Express + TypeScript API server (do not modify; API work belongs in `services/fphgo`).
- `apps/web`: Next.js App Router frontend (`src/app`) with shared UI/components, hooks, and feature modules.
- `services/fphgo`: Go API service; canonical backend for all new API work.
- `packages/config`: Shared runtime/config constants for workspaces.
- `packages/db`: Shared DB package shell (currently minimal export surface) used for workspace dependency boundaries.
- `packages/types`: Shared TypeScript DTOs/envelope types used by API and web.
- `packages/ui`: Shared UI package shell (currently minimal export surface).
- `packages/utils`: Shared utility helpers.

## Setup And Repo Commands
- Install dependencies: `pnpm install`
- Dev (all apps): `pnpm dev`
- Build (packages + apps): `pnpm build`
- Type-check all workspaces: `pnpm typecheck`
- Lint all workspaces: `pnpm lint`
- Test all workspaces: `pnpm test`
- Full preflight: `pnpm preflight`

## Run One Workspace
Use either pattern:
- Directory-based: `pnpm -C <dir> <script>`
- Filter-based: `pnpm --filter <package-name> <script>`

Verified examples:
- `pnpm -C apps/api dev`
- `pnpm --filter @freediving.ph/api test`
- `pnpm -C apps/web build`
- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/types test`

## Global Conventions
- Language: TypeScript across apps/packages.
- Package manager: `pnpm` workspaces (`apps/*`, `packages/*`).
- Lint/format: Biome (`biome lint .`, `biome format --write .`).
- Type-check: `tsc --noEmit` via each workspace `type-check` script.
- Tests: Node test runner (`node --test` in apps, `tsx --test` in packages).
- Shared TS baseline: `tsconfig.base.json`.
- UI implementation rule (web): prefer shadcn/ui components and composition patterns; avoid manual Tailwind utility markup unless a clear gap exists and document why custom classes are needed.
- UI changes must follow existing workspace file structure and code conventions; place new files in the appropriate `app`, `components`, `features`, `lib`, `hooks`, `providers`, or `store` directories.

## How To Not Break The Repo
- Run targeted checks in changed workspaces before opening PRs:
  - `pnpm --filter <package-name> type-check`
  - `pnpm --filter <package-name> lint` (if present)
  - `pnpm --filter <package-name> test` (if present)
- For cross-workspace changes, run repo-level checks: `pnpm typecheck && pnpm lint && pnpm test`.
- Keep shared contracts in `packages/types/src` backward-compatible when possible; update API and web together when DTOs change.
- Do not create feature-local `types.ts` in `apps/web/src/features/*`; define shared contracts in `packages/types/src` and import from `@freediving.ph/types`.
- Do not touch `apps/api`; it is legacy. All API work belongs in `services/fphgo`.
- Do not add workspace-only env assumptions into shared packages.

## ExecPlans
- For complex or risky work, create/update an ExecPlan using `./.agent/PLANS.md`.
