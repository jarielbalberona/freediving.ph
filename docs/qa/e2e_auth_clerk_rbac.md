# E2E Auth + RBAC Manual Validation

## Prerequisites
- Frontend env:
  - `NEXT_PUBLIC_API_URL`
  - `API_URL` (for server-side calls in Next runtime)
  - Clerk publishable/secret keys.
- Go API env:
  - `CLERK_SECRET_KEY` (required unless `DEV_AUTH=true`)
  - optional `CLERK_JWT_KEY`
  - optional `CLERK_JWT_ISSUER`
  - optional `CLERK_JWT_AUDIENCE` (CSV)
  - optional `API_BASE_URL`
  - `CORS_ORIGINS` includes frontend origin.

## 1) Sign in on frontend
1. Start API and web apps.
2. Open frontend and sign in via Clerk.
3. Confirm protected routes (for example `/messages`) no longer redirect or block.

Expected:
- Clerk user is signed in.
- Requests from browser include `Authorization: Bearer <token>`.

## 2) Verify session context endpoint
1. In browser network tab, trigger:
   - `GET /v1/auth/session`
2. Verify response shape:
   - `userId`
   - `clerkSubject`
   - `globalRole`
   - `accountStatus`
   - `permissions[]`
   - `scopes.group`
   - `scopes.event`

Expected:
- `200` for signed-in active member.
- `401` with `{ error: { code: "UNAUTHENTICATED", ... } }` when no token.

## 3) Confirm read access with `content.read`
1. Use a user with default member permissions.
2. Request read endpoints under member content routes, for example:
   - `GET /v1/chika/threads`
   - `GET /v1/messages/inbox`

Expected:
- `200` for active member with read permission.

## 4) Confirm write denied without `content.write`
1. Use a user where effective `content.write` is false via override.
2. Attempt write routes:
   - `POST /v1/chika/threads`
   - `POST /v1/messages/send`

Expected:
- `403` with `{ error: { code: "FORBIDDEN", ... } }`.

## 5) Confirm read_only blocks write methods
1. Set user `account_status=read_only`.
2. Attempt `POST`/`PATCH`/`DELETE` on member routes.

Expected:
- `403` with `{ error: { code: "READ_ONLY", ... } }`.
- `GET` requests still allowed.
- Frontend shows read-only banner and write UI should be hidden or disabled using `useAuthGate().can(...)` and `isReadOnly`.

## 6) Confirm suspended blocks everything protected
1. Set user `account_status=suspended`.
2. Call:
   - `GET /v1/auth/session`
   - any member content route.

Expected:
- `403` with `{ error: { code: "SUSPENDED", ... } }`.
- Frontend shows suspended banner.

## 7) Confirm scoped role resolution path
1. Call `GET /v1/auth/session?groupId=<id>` and/or `?eventId=<id>` for a user with active membership.
2. Verify `scopes.group` or `scopes.event` object values.

Expected:
- Matching role values are returned when active membership exists.
- Missing membership returns `null` for that scope object.
