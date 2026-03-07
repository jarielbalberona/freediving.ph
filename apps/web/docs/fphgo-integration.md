# FPHGO Integration (apps/web)

## Required env vars

Set these in `apps/web/.env.local` (or your deployment env):

```env
NEXT_PUBLIC_FPHGO_BASE_URL=http://localhost:4000
FPHGO_BASE_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

## Run web against local fphgo

1. Start `services/fphgo` on `http://localhost:4000`.
2. Copy `apps/web/.env.example` to `apps/web/.env.local`.
3. Make sure both `NEXT_PUBLIC_FPHGO_BASE_URL` and `FPHGO_BASE_URL` point to your fphgo host.
4. Start web:

```bash
pnpm -C apps/web dev
```

## Common failure modes

- `401 Unauthorized`:
  Clerk token missing or invalid; verify sign-in state and Clerk keys.
- Issuer/audience mismatch:
  Clerk JWT config for `fphgo` does not match the frontend Clerk project.
- Missing base URL:
  `NEXT_PUBLIC_FPHGO_BASE_URL` or `FPHGO_BASE_URL` is empty/misconfigured.
- Path assertion in development:
  A request path did not start with `/v1/`; update the call site to use `src/lib/api/fphgo-routes.ts`.

