# @freediving.ph/web

Next.js 15 frontend for the Freediving Philippines platform.

## Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- React Query
- Clerk (auth UI/session)
- Tailwind CSS + Radix UI

## Scripts

- `pnpm --filter @freediving.ph/web dev`
- `pnpm --filter @freediving.ph/web build`
- `pnpm --filter @freediving.ph/web start`
- `pnpm --filter @freediving.ph/web lint`
- `pnpm --filter @freediving.ph/web type-check`

## Environment

Minimum required frontend env:

```env
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

## Notes

- API contracts are consumed through feature-level clients under `src/features/*/api`.
- Shared API envelope types come from `@freediving.ph/types`.
- Build and lint are intended to run from monorepo root as well.
