# AGENTS.md

## Workspace Contract

This project is onboarded into the parent `ai-development` workspace.

- Read parent `.ai/core/` workflow rules when available.
- Read `.ai-project.md` before task work.
- Use `.ai-local/core-snapshot.md` only as generated fallback when parent `.ai/` is unavailable.
- `project-canon/` is the authoritative durable project truth.
- root `docs/` is legacy by workspace policy and should not be treated as a normal source-of-truth surface during adoption.
- Do not create project-local `.ai/`, `.agent/`, or `.codex/`.
- Final task reports belong in chat/ticket/PR, not random repo markdown.
- Appropriate verification is default. E2E is escalation, not default.

## Monorepo Map
- `apps/web`: Next.js App Router frontend (`src/app`) with shared UI/components, hooks, and feature modules.
- `services/fphgo`: Go API service; canonical backend for all new API work.
- `packages/config`: Shared runtime/config constants for workspaces.
- `packages/db`: Shared DB package shell (currently minimal export surface) used for workspace dependency boundaries.
- `packages/types`: Shared TypeScript DTOs/envelope types used by web-facing API clients.
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
- All API work belongs in `services/fphgo`.
- Do not add workspace-only env assumptions into shared packages.

## Planning
- Keep planning in chat/ticket/PR context or temporary parent `.ai/state/` files only during active work.
- Do not recreate project-local `.agent/` planning files.
