# @freediving.ph/api

Express + TypeScript API for the Freediving Philippines platform.

## Stack

- Express 5
- TypeScript
- Drizzle ORM
- PostgreSQL
- Clerk JWT verification middleware
- Zod validation

## Scripts

- `pnpm --filter @freediving.ph/api dev`
- `pnpm --filter @freediving.ph/api build`
- `pnpm --filter @freediving.ph/api start`
- `pnpm --filter @freediving.ph/api lint`
- `pnpm --filter @freediving.ph/api type-check`
- `pnpm --filter @freediving.ph/api db:generate`
- `pnpm --filter @freediving.ph/api db:push`
- `pnpm --filter @freediving.ph/api db:seed`

## Environment

Environment variables are validated in `src/core/env.ts`.
The loader now supports aliases used by deployment platforms (Render/AWS), but canonical names are:

- `DATABASE_URL`
- `PORT`
- `CSRF_SECRET`
- `NODE_ENV`
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

## Route Registration

Routes are registered in:
- `src/routes/app.routes.ts`

Runtime route mounting is handled by:
- `src/routes/routes.config.ts`
