# fphgo

Go 1.26 API service using Chi + net/http + PostgreSQL + sqlc + nhooyr WebSockets.

## Clerk Authentication

The API accepts Clerk session JWTs as bearer tokens:

- Header: `Authorization: Bearer <token>`
- Global middleware attaches Clerk claims when token is present and valid.
- Member-only routes enforce auth and return 401 JSON when unauthenticated.
- `/ws` requires auth before websocket accept.

### Frontend token flow (Clerk React)

```ts
import { useAuth } from "@clerk/nextjs";

const { getToken } = useAuth();
const token = await getToken();

await fetch("/v1/messages/inbox", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

## Required environment variables

- `DB_DSN` (required)
- `PORT` (optional, default `4000`)
- `APP_ENV` (optional, default `development`)
- `LOG_LEVEL` (optional: `debug|info|warn|error`; defaults to env-based behavior)
- `CORS_ORIGINS` (optional, CSV)
- `RATE_LIMIT_PER_MINUTE` (optional, default `300`)
- `DB_MAX_CONNS` (optional, default `20`)
- `DB_MIN_CONNS` (optional, default `2`, must be <= `DB_MAX_CONNS`)
- `DB_CONN_MAX_LIFETIME` (optional duration, default `30m`)
- `CLERK_SECRET_KEY` (required unless `DEV_AUTH=true`)
- `CLERK_JWT_KEY` (optional, JSON web key string for local JWT verification)
- `CLERK_JWT_ISSUER` (optional, exact `iss` claim expected)
- `CLERK_JWT_AUDIENCE` (optional, CSV list, requires token `aud` overlap)
- `DEV_AUTH` (optional, local dev fallback only)
- `API_BASE_URL` (optional, public API origin metadata)

Production guards:
- `APP_ENV=production` rejects `DEV_AUTH=true`.
- `APP_ENV=production` rejects wildcard `CORS_ORIGINS=*`.

## Example curl

```bash
TOKEN="<clerk-session-token>"
curl -i \
  -H "Authorization: Bearer ${TOKEN}" \
  http://localhost:4000/v1/messages/inbox
```

Websocket example:

```bash
wscat -c "ws://localhost:4000/ws" -H "Authorization: Bearer ${TOKEN}"
```
