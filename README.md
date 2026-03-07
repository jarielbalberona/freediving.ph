# Freediving Philippines

![Freediving Philippines Banner](https://raw.githubusercontent.com/jarielbalberona/freediving.ph/refs/heads/main/app/public/images/freedivingph-blue-transparent.png)

_A social platform built for freedivers, by freedivers._

## About the project

Freediving Philippines is an open-source social web app for the freediving community in the Philippines. Inspired by Instagram, Pinterest, and Reddit, it gives divers a place to connect, share experiences, and explore dive sites across the country.

## Features

### Social

- **Profiles** – Showcase your dives, share records, and post freediving adventures.
- **Messaging** – Private messaging with other freedivers.
- **Buddies & groups** – Find dive buddies and create or join freediving groups.
- **Chika (forum)** – Start and join discussions, including anonymous threads.

### Diving-specific

- **Explore** – Discover and contribute dive sites on an interactive map.
- **Buddy finder** – See available dive buddies at specific locations.
- **Events** – Organize and join public freediving events.
- **Competitive records** – Share PBs and national records (e.g. AIDA).

## What this repo contains

- **`apps/web`** – Next.js 15 (App Router) frontend.
- **`services/fphgo`** – Go API service (canonical backend).
- **`packages/types`** – Shared DTO/envelope contracts for API and web.
- **`packages/config`** – Shared runtime constants/config helpers.
- **`packages/utils`** – Shared utility functions.
- **`packages/db`** – Shared DB tooling surface.
- **`packages/ui`** – Shared UI package shell.

## Tech stack

- **Frontend:** Next.js 15, React 19, TypeScript, TanStack Query, Tailwind.
- **Backend:** Go (fphgo), PostgreSQL, sqlc, goose migrations.
- **Auth:** Clerk.
- **Tooling:** pnpm workspaces, Biome, Node test runner, tsx tests.
- **Deployment:** CI/CD (e.g. GitHub Actions). Cloud: AWS, Cognito, ECS, RDS, Route53, S3. Infrastructure: Terraform (multi-environment).

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL 15+ (or Docker)
- For the Go API: Go 1.26, `sqlc`. `goose` is run via the fphgo Makefile (no global install needed).

## Quick start

```bash
git clone https://github.com/jarielbalberona/freediving.ph.git
cd freediving.ph
pnpm install
```

Set environment variables:

- **Web:** `apps/web/.env` (see [Environment variables](#environment-variables) below).
- **Go API:** `services/fphgo/.env` – copy from `services/fphgo/.env.example`.

Run the stack:

**Option A – Docker (database + Go API)**

```bash
docker compose up -d database fphgo
pnpm dev:web
```

**Option B – Local Go API**

```bash
pnpm dev:go
```

In another terminal:

```bash
pnpm dev:web
```

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

## Environment variables

**Web (`apps/web/.env`)** – minimum:

- `NEXT_PUBLIC_API_URL`
- `API_URL` (server-side; usually same as `NEXT_PUBLIC_API_URL`)
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

**Go API (`services/fphgo/.env`)** – see `services/fphgo/.env.example`. Typical local values:

- `DB_DSN=postgres://postgres:postgres@localhost:5432/fph?sslmode=disable`
- `PORT=4000`
- `APP_ENV=development`
- `CORS_ORIGINS=http://localhost:3000`

## Root scripts

```bash
pnpm dev          # run web app (and other apps under apps/*)
pnpm build        # build packages, then web (and any other app builds)
pnpm typecheck    # type-check all workspaces
pnpm lint         # lint all workspaces
pnpm test         # run all workspace tests
pnpm preflight    # typecheck + lint + test + build
```

Shortcuts:

```bash
pnpm dev:web
pnpm build:web
pnpm dev:go       # run Go API
pnpm test:go
pnpm sqlc:go
pnpm migrate:go   # run Go API DB migrations
```

## Workspace commands

```bash
pnpm -C <dir> <script>
pnpm --filter <package-name> <script>
```

Examples:

```bash
pnpm -C apps/web build
pnpm --filter @freediving.ph/web type-check
pnpm --filter @freediving.ph/types test
```

## Database

- **Go API:** Migrations live in `services/fphgo/db/migrations`. Run with `pnpm migrate:go` (goose).
- **Drizzle (packages/db):** Optional shared DB tooling; use `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:push`, `pnpm db:studio` from repo root as needed.

## Docker (local)

PostgreSQL and the Go API:

```bash
docker compose up -d database fphgo
```

Or build and run in foreground:

```bash
docker compose up --build fphgo
```

## Deployment

Render blueprint: `render.yaml`. Env template: `env.render.example`.

## Quality gate before PRs

For a single workspace:

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

## Contributing

Freediving Philippines is **open source** and we welcome contributions. Fork the repo, open an issue for feature ideas, or send a pull request.

1. **Fork** the repository.
2. Create a **new branch** for your feature.
3. Commit with a meaningful message.
4. Submit a **pull request** for review.

**Contribution notes:**

- Keep shared contracts in `packages/types/src`; update API and web together when DTOs change.
- Do not add feature-local `types.ts` in `apps/web/src/features/*`; use `@freediving.ph/types`.
- Avoid workspace-specific env assumptions in shared packages.

## Looking for developers

We’re looking for **software developers** to help build and improve the platform. If you’re interested, open an issue or start contributing.

## Contact & community

- **Email:** jariel@saltandsun.life
- **Reddit:** [r/freedivingph](https://reddit.com/r/freedivingph)
- **GitHub Issues:** [Report bugs & request features](https://github.com/jarielbalberona/freediving.ph/issues)

_Let’s build the best freediving platform in the Philippines._
