# Current Architecture Snapshot (Step 0)

## Services
- Web app: Next.js 15 App Router (`apps/web`) with Clerk middleware, React Query, and feature API clients.
- API: Express 5 + TypeScript (`apps/api`) with route modules per feature and Zod validation in controllers.
- Shared packages: `@freediving.ph/types`, `@freediving.ph/config`, `@freediving.ph/utils`.

## Data Stores And Infrastructure
- Primary DB: PostgreSQL (local Docker + Render Postgres in deployment manifests).
- ORM/query layer: Drizzle ORM (`apps/api/src/models/drizzle`, `apps/api/.drizzle/migrations`).
- File/media handling: Multer upload middleware + AWS S3 SDK dependencies configured.
- Hosting/deploy: Render blueprint (`render.yaml`) for API + Web + Postgres.

## Auth And Session Model
- Identity provider: Clerk.
- API auth: Bearer token verification with `@clerk/backend` (`clerkAuthMiddleware`) and user lookup in `users` table.
- Web auth: Clerk Next.js middleware and token injection in HTTP client.
- CSRF middleware is globally enabled in API (`doubleCsrfProtection`) while auth is mainly bearer-token based.

## Main API Route Surface
- Mounted in `apps/api/src/routes/app.routes.ts`: `auth`, `users`, `profiles`, `threads`, `messages`, `buddies`, `groups`, `events`, `dive-spots`, `reports`, `notifications`, `media`, `user-services`, `competitive-records`, and placeholder/future modules (`training-logs`, `safety-resources`, `awareness`, `marketplace`, `collaboration`).

## Critical Flows
- Identity bootstrap: Clerk token -> API middleware verifies token -> maps to local DB user.
- Chika/forums: create thread/comments/reactions with support for pseudonymous thread mode and pseudonym mapping table.
- Messaging: direct conversation lifecycle with moderation remove action.
- Buddy network: requests, accept/reject/cancel, list active buddies, finder search.
- Events/groups/dive spots: CRUD + moderation-oriented status transitions in selected modules.
- Reporting/moderation: reports endpoints plus moderation audit table references in services.

## Production Gaps Observed
- Authorization checks are inconsistent (middleware exists, but role model and policy usage are fragmented).
- Error shape and validation error handling are inconsistent across controllers.
- Pagination is missing in several legacy UGC list endpoints.
- Global rate limiting is present but disabled at app level.
