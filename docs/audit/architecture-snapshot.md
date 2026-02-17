# Architecture Snapshot (Evidence-Based)

## Scope and method
- Source audited: `docs/specs/main.md` (FPH Feature Specification v1.1), `apps/api`, `apps/web`, `packages/*`, infra/config files.
- Rule: any claim below is backed by code evidence. If not found: `Missing` or `Unknown`.

## Service layout
- Monorepo workspaces: `apps/api`, `apps/web`, `packages/config`, `packages/db`, `packages/types`, `packages/ui`, `packages/utils`.
- API entrypoint: `apps/api/src/server.ts` (`startServer`) bootstraps `apps/api/src/app.ts`.
- API middleware chain: `apps/api/src/app.ts` (`helmet`, `cors`, JSON parsing, cookies, request context, metrics, logger, rate limit, CSRF, routes, error handlers).
- Route registry: `apps/api/src/routes/app.routes.ts` exports mounted routers (`/auth`, `/threads`, `/messages`, `/reports`, `/moderation`, etc.); mounted by `apps/api/src/routes/routes.config.ts`.
- Frontend entrypoint: `apps/web/src/app/layout.tsx` (Next.js App Router + ClerkProvider + React Query).

## Auth model and session/token approach
- Auth provider: Clerk JWT verification (`apps/api/src/middlewares/clerk.middleware.ts`, `clerkAuthMiddleware`, `optionalClerkAuthMiddleware`).
- Token transport: Bearer token required in API middleware (`Authorization: Bearer <token>`).
- Identity binding: Clerk `payload.sub` mapped to local `users.clerkId` (`apps/api/src/middlewares/clerk.middleware.ts`).
- Account status gate: non-`ACTIVE` users blocked in auth middleware (`apps/api/src/middlewares/clerk.middleware.ts`).
- Role/policy enforcement helpers:
  - role checks: `requireRole`, `requireAnyRole`, `requirePlatformRole` in `apps/api/src/middlewares/clerk.middleware.ts`
  - policy checks: `requirePolicy` + map in `apps/api/src/core/policies.ts`
- CSRF:
  - middleware enabled globally: `app.use(doubleCsrfProtection)` in `apps/api/src/app.ts`
  - token endpoint: `GET /csrf-token` (`apps/api/src/routes/csrf.route.ts`)
  - frontend hook exists: `apps/web/src/hooks/use-csrf.ts`
- Legacy auth endpoints for login/register: `Missing` in API routes; frontend hook still calls `/auth/login` and `/auth/register` (`apps/web/src/hooks/react-queries/auth.ts`).

## RBAC and authorization boundaries (current)
- Global role mapping: `apps/api/src/core/authorization.ts` (`mapDbRoleToPlatformRole`, `hasMinimumPlatformRole`).
- Report/moderation policy map: `apps/api/src/core/policies.ts`.
- Server-side authorization is present in some modules (reports/moderation/messages), but inconsistent in others:
  - Example enforced: `apps/api/src/app/reports/reports.routes.ts` + `requirePolicy`.
  - Example missing ownership checks: `apps/api/src/app/threads/threads.service.ts` (`update`, `delete` do not verify owner/moderator).

## Database layer, ORM, migrations
- ORM: Drizzle ORM + postgres-js (`apps/api/src/databases/drizzle/connection.ts`).
- Schema aggregation: `apps/api/src/databases/drizzle/schema.ts` imports all `apps/api/src/models/drizzle/*.model.ts`.
- Drizzle config: `apps/api/drizzle.config.ts` (schema path `./src/models/drizzle`, migrations `./.drizzle/migrations/`).
- Migration directory exists: `apps/api/.drizzle/migrations`.
- Core moderation/privacy tables implemented in schema:
  - `blocks`, `reports`, `audit_logs`, `thread_moderation_states`, `user_feature_restrictions` in `apps/api/src/models/drizzle/moderation.model.ts`
  - pseudonym tables `thread_category_modes`, `chika_pseudonyms` in `apps/api/src/models/drizzle/chika.model.ts`
  - profile/PB visibility and soft-delete fields in `apps/api/src/models/drizzle/profiles.model.ts`

## Storage, uploads, realtime, notifications
- Local upload storage:
  - multer disk uploads under `uploads/original` (`apps/api/src/multer/globalConfig.ts`)
  - static serving of uploads: `app.use('/uploads', express.static(...))` in `apps/api/src/app.ts`
- S3 presigned URL endpoint exists: `GET /media/presigned-url/:username` (`apps/api/src/app/media/media.routes.ts`, handler `createPresignedS3URL` in `apps/api/src/app/media/media.controller.ts`).
- Realtime/websocket:
  - `socket.io` dependency present (`apps/api/package.json`), but no runtime socket server wiring found. `apps/api/src/app.ts` has only a comment placeholder. Status: `Missing`.
- Notifications:
  - DB-backed notifications module exists (`apps/api/src/app/notifications/*`, schema `apps/api/src/models/drizzle/notifications.model.ts`).
  - Push/websocket delivery path: `Unknown/Not found`.

## Abuse controls, moderation, audit logging
- Global request rate limiter: `apps/api/src/rateLimiter.ts` + applied in `apps/api/src/app.ts`.
- Feature limits and account-age gates defined in `apps/api/src/core/abuseControls.ts`.
- Feature-specific route limiters applied in:
  - threads: `apps/api/src/app/threads/threads.routes.ts`
  - messages: `apps/api/src/app/messages/messages.routes.ts`
  - buddies: `apps/api/src/app/buddies/buddies.routes.ts`
  - awareness/collaboration/marketplace: corresponding route files.
- Moderation/reporting routes:
  - reports: `apps/api/src/app/reports/reports.routes.ts`
  - moderation actions: `apps/api/src/app/moderation/moderation.routes.ts`
- Audit logs are written for some sensitive actions (reports/moderation/events/dive spots/messages moderation/etc.): `apps/api/src/app/**/**.service.ts` with `insert(auditLogs)`.
- Audit logging coverage is incomplete for several sensitive paths (e.g., user anonymization, buddy state changes, thread owner deletes, block CRUD). See findings.

## Deployment and ops setup
- Render blueprints:
  - root multi-service: `render.yaml`
  - app-specific files: `apps/api/render.yaml`, `apps/web/render.yaml`
- Docker:
  - local compose: `docker-compose.yml`
  - app Dockerfiles: `apps/api/Dockerfile`, `apps/web/Dockerfile`
- IaC:
  - Terraform modules + env stacks under `terraform/`.
- CI/CD:
  - GitHub Actions quality pipeline (`.github/workflows/ci.yml`) runs typecheck/lint/test/build on push/PR.
- Deployment automation details beyond CI (promotion strategy, rollback policy): `Unknown` (not found in repo).

## Notable architecture inconsistencies
- API docs/comments say routes start with `/api`, but actual mounting in `apps/api/src/routes/routes.config.ts` does not prepend `/api`.
- Mixed auth era artifacts:
  - Clerk is active server auth.
  - frontend still has legacy login/register client hooks (`apps/web/src/hooks/react-queries/auth.ts`) with no matching API handlers.
