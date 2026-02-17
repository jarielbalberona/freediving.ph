# Freediving.ph Monorepo

Monorepo for the Freediving Philippines platform.

## What this repo contains

- `apps/api`: Express 5 + TypeScript API, route modules, middleware, Drizzle models/migrations, seeding.
- `apps/web`: Next.js 15 (App Router) frontend.
- `packages/types`: shared DTO/envelope contracts used by API and web.
- `packages/config`: shared runtime constants/config helpers.
- `packages/utils`: shared utility functions.
- `packages/db`: shared DB tooling surface (Drizzle scripts).
- `packages/ui`: shared UI package shell.

## Tech stack

- Frontend: Next.js 15, React 19, TypeScript, TanStack Query, Tailwind.
- Backend: Express 5, TypeScript, Drizzle ORM, PostgreSQL.
- Auth: Clerk.
- Tooling: pnpm workspaces, Biome, Node test runner, tsx tests.

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+ (or Docker)

## Quick start

```bash
git clone https://github.com/jarielbalberona/freediving.ph.git
cd freediving.ph
pnpm install
```

Set environment variables:

- API env: `apps/api/.env`
- Web env: `apps/web/.env`

Then run both apps:

```bash
pnpm dev
```

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

## Environment variables

Canonical API env keys are validated in `apps/api/src/core/env.ts`:

- `DATABASE_URL`
- `PORT`
- `CSRF_SECRET`
- `NODE_ENV` (`development` or `production`)
- `ORIGIN_URL`
- `APP_URL`
- `API_URL`
- `AWS_REGION`
- `AWS_ACCESS_KEY`
- `AWS_SECRET_KEY`
- `AWS_S3_FPH_BUCKET_NAME`
- `EMAIL_SERVER_HOST`
- `EMAIL_SERVER_PORT`
- `EMAIL_SERVER_USER`
- `EMAIL_SERVER_PASSWORD`
- `EMAIL_FROM`

The API also supports deployment aliases and normalizes them automatically:

- `CORS_ORIGIN` -> `ORIGIN_URL`
- `NEXT_PUBLIC_APP_URL` -> `APP_URL`
- `NEXT_PUBLIC_API_URL` -> `API_URL`
- `AWS_ACCESS_KEY_ID` -> `AWS_ACCESS_KEY`
- `AWS_SECRET_ACCESS_KEY` -> `AWS_SECRET_KEY`
- `AWS_S3_BUCKET` -> `AWS_S3_FPH_BUCKET_NAME`
- `EMAIL_HOST` -> `EMAIL_SERVER_HOST`
- `EMAIL_PORT` -> `EMAIL_SERVER_PORT`
- `EMAIL_USER` -> `EMAIL_SERVER_USER`
- `EMAIL_PASS` -> `EMAIL_SERVER_PASSWORD`

Minimum web env:

- `NEXT_PUBLIC_API_URL`
- `API_URL` (for server-side calls; usually same value as `NEXT_PUBLIC_API_URL`)
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

## Root scripts

```bash
pnpm dev          # run apps in parallel
pnpm build        # build packages, then API and web
pnpm typecheck    # type-check all workspaces
pnpm lint         # lint all workspaces
pnpm test         # run all workspace tests
pnpm preflight    # typecheck + lint + test + build
```

Single-app shortcuts:

```bash
pnpm dev:api
pnpm dev:web
pnpm build:api
pnpm build:web
```

## Workspace commands

Run scripts in one workspace via either pattern:

```bash
pnpm -C <dir> <script>
pnpm --filter <package-name> <script>
```

Examples:

```bash
pnpm -C apps/api dev
pnpm --filter @freediving.ph/api test
pnpm -C apps/web build
pnpm --filter @freediving.ph/web type-check
pnpm --filter @freediving.ph/types test
```

## Database workflows

From repo root:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
pnpm db:seed
```

Schema and migrations are under:

- `apps/api/src/models/drizzle`
- `apps/api/.drizzle/migrations`

## Docker (local)

Run only PostgreSQL in Docker (API and web run locally with `pnpm dev`):

```bash
docker compose up -d database
```

Use this database URL in `apps/api/.env`:

```bash
DATABASE_URL=postgres://fphbuddies:fphbuddiespw@localhost:5432/freedivingph
```

## Deployment

Render blueprint is in `render.yaml` and env template is in `env.render.example`.

## Quality gate before PRs

For changed workspace(s):

```bash
pnpm --filter <package-name> type-check
pnpm --filter <package-name> lint
pnpm --filter <package-name> test
```

For cross-workspace changes:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## Contribution notes

- Keep shared contracts in `packages/types/src` and update API/web together when DTOs change.
- Do not create feature-local `types.ts` files in `apps/web/src/features/*`; use `@freediving.ph/types`.
- Avoid adding workspace-specific env assumptions into shared packages.
