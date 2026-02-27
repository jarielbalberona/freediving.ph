# API Compatibility Matrix: `apps/web` vs `services/fphgo`

Last updated: 2026-02-27

## Scope And Sources

Web call sites scanned:
- `apps/web/src/features/**/api/**/*.{ts,tsx}`
- `apps/web/src/lib/api/**/*.{ts,tsx}`
- `apps/web/src/lib/http/**/*.{ts,tsx}`

Go route sources scanned:
- `services/fphgo/internal/app/routes.go`
- `services/fphgo/internal/features/*/http/routes.go`

## Summary Table

| Endpoint | Method | Web caller | Go handler | Status |
|---|---|---|---|---|
| `/v1/auth/session` | `GET` | `useSession()` in `apps/web/src/features/auth/session/use-session.ts` | `GetSession` in `services/fphgo/internal/features/auth/http/handlers.go` | `OK` |
| `/v1/messages/inbox` | `GET` | `messagesApi.getConversations()` in `apps/web/src/features/messages/api/messages.ts` | `Inbox` in `services/fphgo/internal/features/messaging/http/handlers.go` | `OK` |
| `/v1/messages/inbox` | `GET` | `messagesApi.getMessages()` in `apps/web/src/features/messages/api/messages.ts` | `Inbox` in `services/fphgo/internal/features/messaging/http/handlers.go` | `Shape mismatch` |
| `/v1/messages/send` | `POST` | `messagesApi.sendMessage()` in `apps/web/src/features/messages/api/messages.ts` | `Send` in `services/fphgo/internal/features/messaging/http/handlers.go` | `Shape mismatch` |
| `/v1/chika/threads` | `GET` | `threadsApi.getAll()` in `apps/web/src/features/chika/api/threads.ts` | `ListThreads` in `services/fphgo/internal/features/chika/http/handlers.go` | `OK` |
| `/v1/chika/threads/{id}` | `GET` | `threadsApi.getById()` in `apps/web/src/features/chika/api/threads.ts` | `GetThread` in `services/fphgo/internal/features/chika/http/handlers.go` | `OK` |
| `/v1/chika/threads` | `POST` | `threadsApi.create()` in `apps/web/src/features/chika/api/threads.ts` | `CreateThread` in `services/fphgo/internal/features/chika/http/handlers.go` | `OK` |
| `/v1/chika/threads/{id}` | `PATCH` | `threadsApi.update()` in `apps/web/src/features/chika/api/threads.ts` | `UpdateThread` in `services/fphgo/internal/features/chika/http/handlers.go` | `OK` |
| `/v1/chika/threads/{id}` | `DELETE` | `threadsApi.delete()` in `apps/web/src/features/chika/api/threads.ts` | `DeleteThread` in `services/fphgo/internal/features/chika/http/handlers.go` | `Shape mismatch` |
| `/v1/chika/threads/{id}/reactions` | `POST` | `threadsApi.like()`/`threadsApi.unlike()` in `apps/web/src/features/chika/api/threads.ts` | `SetThreadReaction` in `services/fphgo/internal/features/chika/http/handlers.go` | `OK` |
| `/v1/chika/threads/{id}/reactions` | `DELETE` | `threadsApi.removeReaction()` in `apps/web/src/features/chika/api/threads.ts` | `RemoveThreadReaction` in `services/fphgo/internal/features/chika/http/handlers.go` | `Shape mismatch` |
| `/v1/chika/threads/{id}/comments` | `GET` | `threadsApi.getComments()` in `apps/web/src/features/chika/api/threads.ts` | `ListComments` in `services/fphgo/internal/features/chika/http/handlers.go` | `OK` |
| `/v1/chika/threads/{id}/comments` | `POST` | `threadsApi.createComment()` in `apps/web/src/features/chika/api/threads.ts` | `CreateComment` in `services/fphgo/internal/features/chika/http/handlers.go` | `OK` |

## Per-Feature Breakdown

### Auth/Session

Web usage:
- Caller: `useSession()` (`apps/web/src/features/auth/session/use-session.ts:34`)
- Endpoint: `GET /v1/auth/session` via `routes.v1.me()` (`apps/web/src/lib/api/fphgo-routes.ts:5`)
- Request body type: none
- Expected response type (TS): local `MeResponse` in `apps/web/src/features/auth/session/use-session.ts`

Go route:
- Route: mounted as `/v1/auth/session` in `services/fphgo/internal/features/auth/http/routes.go:7`
- Handler: `GetSession` in `services/fphgo/internal/features/auth/http/handlers.go:20`
- Required auth: `RequireMember` (from `services/fphgo/internal/app/routes.go:75`)

Compatibility notes:
- Shape is aligned and now consumed through shared `@freediving.ph/types` `MeResponse`.

### Messaging

#### `GET /v1/messages/inbox`

Web usage 1:
- Caller: `messagesApi.getConversations()` (`apps/web/src/features/messages/api/messages.ts:12`)
- Request body type: none
- Expected response type (TS): inline `{ items?: Array<{ conversationId; messageId; senderId; content; status; createdAt }> }`

Web usage 2:
- Caller: `messagesApi.getMessages(conversationId, filters?)` (`apps/web/src/features/messages/api/messages.ts:67`)
- Request body type: none
- Expected response type (TS): same inline inbox shape, then remapped to `ConversationMessage[]`

Go route:
- Route: `/inbox` in `services/fphgo/internal/features/messaging/http/routes.go:12`
- Handler: `Inbox` in `services/fphgo/internal/features/messaging/http/handlers.go:78`
- Required auth: `RequireMember` + `RequirePermission(messaging.read)` inherited from `services/fphgo/internal/app/routes.go`

Compatibility notes:
- Shape for inbox itself matches the inline expected shape.
- `getMessages()` uses inbox as a stand-in for a conversation messages endpoint, which is semantically mismatched but not a route-missing problem.

#### `POST /v1/messages/send`

Web usage:
- Caller: `messagesApi.sendMessage(conversationId, payload)` (`apps/web/src/features/messages/api/messages.ts:105`)
- Request body type: inline `{ recipientId: string; content: string }`, where `recipientId = String(conversationId)` and `conversationId` is numeric
- Expected response type (TS): inline `{ conversationId: string; status: string }`

Go route:
- Route: `/send` in `services/fphgo/internal/features/messaging/http/routes.go:16`
- Handler: `Send` in `services/fphgo/internal/features/messaging/http/handlers.go:24`
- Required auth: `RequireMember` + `RequirePermission(messaging.read)` + `RequirePermission(messaging.write)`

Compatibility notes:
- Request validation mismatch: Go requires `recipientId` UUID (`validate:"required,uuid"` in `services/fphgo/internal/features/messaging/http/dto.go:4`), but web sends numeric conversation IDs cast to string.

### Chika

#### `GET /v1/chika/threads`

Web usage:
- Caller: `threadsApi.getAll()` (`apps/web/src/features/chika/api/threads.ts:63`)
- Request body type: none
- Expected response type (TS): local `FphgoThreadsResponse` (`items?: FphgoThread[]`)

Go route:
- Route: `/threads` in `services/fphgo/internal/features/chika/http/routes.go:12`
- Handler: `ListThreads` in `services/fphgo/internal/features/chika/http/handlers.go:47`
- Required auth: `RequireMember` + `RequirePermission(chika.read)`

Compatibility notes:
- Response includes `pagination`; web ignores it. This is compatible.

#### `GET /v1/chika/threads/{id}`

Web usage:
- Caller: `threadsApi.getById(id)` (`apps/web/src/features/chika/api/threads.ts:70`)
- Request body type: none
- Expected response type (TS): local `FphgoThread`

Go route:
- Route: `/threads/{threadId}` in `services/fphgo/internal/features/chika/http/routes.go:13`
- Handler: `GetThread` in `services/fphgo/internal/features/chika/http/handlers.go:70`
- Required auth: `RequireMember` + `RequirePermission(chika.read)`

Compatibility notes:
- Path param naming differs (`id` vs `threadId`) but route shape matches.

#### `POST /v1/chika/threads`

Web usage:
- Caller: `threadsApi.create(data)` (`apps/web/src/features/chika/api/threads.ts:77`)
- Request body type: inline `{ title: string; mode: "open" }`
- Expected response type (TS): local `FphgoThread`

Go route:
- Route: `/threads` in `services/fphgo/internal/features/chika/http/routes.go:20`
- Handler: `CreateThread` in `services/fphgo/internal/features/chika/http/handlers.go:22`
- Required auth: `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)`

Compatibility notes:
- Body includes no `content`; web is already compensating by storing content client-side only.

#### `PATCH /v1/chika/threads/{id}`

Web usage:
- Caller: `threadsApi.update(id, data)` (`apps/web/src/features/chika/api/threads.ts:99`)
- Request body type: inline `{ title: string }`
- Expected response type (TS): local `FphgoThread`

Go route:
- Route: `/threads/{threadId}` in `services/fphgo/internal/features/chika/http/routes.go:21`
- Handler: `UpdateThread` in `services/fphgo/internal/features/chika/http/handlers.go:82`
- Required auth: `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)`

Compatibility notes:
- Aligned.

#### `DELETE /v1/chika/threads/{id}`

Web usage:
- Caller: `threadsApi.delete(id)` (`apps/web/src/features/chika/api/threads.ts:132`)
- Request body type: none
- Expected response type (TS): `void`

Go route:
- Route: `/threads/{threadId}` in `services/fphgo/internal/features/chika/http/routes.go:22`
- Handler: `DeleteThread` in `services/fphgo/internal/features/chika/http/handlers.go:113`
- Required auth: `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)`

Compatibility notes:
- Go returns `200 {"status":"deleted"}`; web ignores body. Compatible at runtime but response contract is not explicit/shared.

#### `POST /v1/chika/threads/{id}/reactions`

Web usage:
- Caller: `threadsApi.like(id)` and `threadsApi.unlike(id)` (`apps/web/src/features/chika/api/threads.ts:138`, `:145`)
- Request body type: inline `{ type: "1" }` and `{ type: "0" }`
- Expected response type (TS): `void`

Go route:
- Route: `/threads/{threadId}/reactions` in `services/fphgo/internal/features/chika/http/routes.go:27`
- Handler: `SetThreadReaction` in `services/fphgo/internal/features/chika/http/handlers.go:286`
- Required auth: `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)`

Compatibility notes:
- Route auth is now feature-scoped (`chika.read` + `chika.write`) instead of broad `content.write`.
- Contract mismatch risk: request `type` is unbounded string in Go; web sends numeric strings.

#### `DELETE /v1/chika/threads/{id}/reactions`

Web usage:
- Caller: `threadsApi.removeReaction(id)` (`apps/web/src/features/chika/api/threads.ts:152`)
- Request body type: none
- Expected response type (TS): `void`

Go route:
- Route: `/threads/{threadId}/reactions` in `services/fphgo/internal/features/chika/http/routes.go:28`
- Handler: `RemoveThreadReaction` in `services/fphgo/internal/features/chika/http/handlers.go:307`
- Required auth: `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)`

Compatibility notes:
- Go returns `200 {"status":"removed"}`; web ignores body.

#### `GET /v1/chika/threads/{id}/comments`

Web usage:
- Caller: `threadsApi.getComments(threadId)` (`apps/web/src/features/chika/api/threads.ts:158`)
- Request body type: none
- Expected response type (TS): local `FphgoCommentsResponse`

Go route:
- Route: `/threads/{threadId}/comments` in `services/fphgo/internal/features/chika/http/routes.go:15`
- Handler: `ListComments` in `services/fphgo/internal/features/chika/http/handlers.go:200`
- Required auth: `RequireMember` + `RequirePermission(chika.read)`

Compatibility notes:
- Aligned.

#### `POST /v1/chika/threads/{id}/comments`

Web usage:
- Caller: `threadsApi.createComment(threadId, content)` (`apps/web/src/features/chika/api/threads.ts:180`)
- Request body type: inline `{ content: string }`
- Expected response type (TS): `void`

Go route:
- Route: `/threads/{threadId}/comments` in `services/fphgo/internal/features/chika/http/routes.go:24`
- Handler: `CreateComment` in `services/fphgo/internal/features/chika/http/handlers.go:176`
- Required auth: `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)`

Compatibility notes:
- Go returns created comment object; web ignores it.

## Unused But Defined Web Route Helpers

Defined in `apps/web/src/lib/api/fphgo-routes.ts` and not currently called from scanned web API modules:
- `GET /v1/messages/requests`
- `POST /v1/messages/{conversationId}/accept`
- `POST /v1/messages/{conversationId}/reject`

## Go Endpoint Inventory With Auth Requirement

Derived from `services/fphgo/internal/app/routes.go` and per-feature route files.

| Method | Path | Handler | Auth requirement |
|---|---|---|---|
| `GET` | `/healthz` | inline | Public |
| `GET` | `/readyz` | inline | Public |
| `GET` | `/profiles/{username}` | `UsersHandler.GetProfileByUsername` | Public (identity middleware attached globally, but no `RequireMember`) |
| `POST` | `/v1/users` | `users.http.Handlers.CreateUser` | Public |
| `GET` | `/v1/users/me` | `users.http.Handlers.GetMe` | `RequireMember` |
| `GET` | `/v1/users/{id}` | `users.http.Handlers.GetUser` | `RequireMember` + `RequirePermission(users.read)` |
| `GET` | `/v1/explore/dive-sites` | `explore.http.Handlers.ListDiveSites` | Public |
| `GET` | `/v1/auth/session` | `auth.http.Handlers.GetSession` | `RequireMember` |
| `GET` | `/v1/messages/inbox` | `messaging.http.Handlers.Inbox` | `RequireMember` + `RequirePermission(messaging.read)` |
| `GET` | `/v1/messages/requests` | `messaging.http.Handlers.Requests` | `RequireMember` + `RequirePermission(messaging.read)` |
| `POST` | `/v1/messages/send` | `messaging.http.Handlers.Send` | `RequireMember` + `RequirePermission(messaging.read)` + `RequirePermission(messaging.write)` |
| `POST` | `/v1/messages/{conversationId}/accept` | `messaging.http.Handlers.Accept` | `RequireMember` + `RequirePermission(messaging.read)` + `RequirePermission(messaging.write)` |
| `POST` | `/v1/messages/{conversationId}/reject` | `messaging.http.Handlers.Reject` | `RequireMember` + `RequirePermission(messaging.read)` + `RequirePermission(messaging.write)` |
| `GET` | `/v1/chika/threads` | `chika.http.Handlers.ListThreads` | `RequireMember` + `RequirePermission(chika.read)` |
| `GET` | `/v1/chika/threads/{threadId}` | `chika.http.Handlers.GetThread` | `RequireMember` + `RequirePermission(chika.read)` |
| `GET` | `/v1/chika/threads/{threadId}/posts` | `chika.http.Handlers.ListPosts` | `RequireMember` + `RequirePermission(chika.read)` |
| `GET` | `/v1/chika/threads/{threadId}/comments` | `chika.http.Handlers.ListComments` | `RequireMember` + `RequirePermission(chika.read)` |
| `GET` | `/v1/chika/threads/{threadId}/media` | `chika.http.Handlers.ListThreadMedia` | `RequireMember` + `RequirePermission(chika.read)` |
| `POST` | `/v1/chika/threads` | `chika.http.Handlers.CreateThread` | `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)` |
| `PATCH` | `/v1/chika/threads/{threadId}` | `chika.http.Handlers.UpdateThread` | `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)` |
| `DELETE` | `/v1/chika/threads/{threadId}` | `chika.http.Handlers.DeleteThread` | `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)` |
| `POST` | `/v1/chika/threads/{threadId}/posts` | `chika.http.Handlers.CreatePost` | `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)` |
| `POST` | `/v1/chika/threads/{threadId}/comments` | `chika.http.Handlers.CreateComment` | `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)` |
| `PATCH` | `/v1/chika/comments/{commentId}` | `chika.http.Handlers.UpdateComment` | `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)` |
| `DELETE` | `/v1/chika/comments/{commentId}` | `chika.http.Handlers.DeleteComment` | `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)` |
| `POST` | `/v1/chika/threads/{threadId}/reactions` | `chika.http.Handlers.SetThreadReaction` | `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)` |
| `DELETE` | `/v1/chika/threads/{threadId}/reactions` | `chika.http.Handlers.RemoveThreadReaction` | `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)` |
| `POST` | `/v1/chika/media` | `chika.http.Handlers.CreateMediaAsset` | `RequireMember` + `RequirePermission(chika.read)` + `RequirePermission(chika.write)` |
| `GET` | `/ws` | `deps.WSHandler.ServeHTTP` | `RequireMember` + `RequirePermission(messaging.read)` |

## Prioritized Gap List

### P0 (Must fix first)

1. `POST /v1/messages/send` request contract mismatch (`recipientId` uuid required by Go, numeric-conversation value sent by web).
2. `messagesApi.getMessages()` still uses `/v1/messages/inbox` as a surrogate conversation endpoint.

### P1 (Should fix next)

1. Chika write endpoints return bodies while web expects `void` for some calls; formalize explicit response contracts.
2. Inline web response types in feature modules should progressively move to shared `packages/types` DTOs.

### P2 (Backlog hygiene)

1. Unused route helper coverage (`/v1/messages/requests`, `/accept`, `/reject`) should be either consumed by web or removed from route helper surface.

## Notes On Session And Error Shapes

- Session now consumes shared `MeResponse` from `packages/types`.
- Go auth/error responses are normalized to lowercase contract codes (`unauthenticated`, `forbidden`, `not_found`) via shared response helpers.
- Validation issues still arrive from Go as path arrays (`issues[].path: []any`) per service AGENTS; web now normalizes these paths into string form for the shared TS `ApiError` consumer shape.

## First Migration Targets (P0)

1. `GET /v1/auth/session` contract-hardening to shared `MeResponse` + shared `ApiError` (completed).
2. `GET /v1/messages/inbox` contract test and response DTO lock (completed).
3. `GET /v1/chika/threads` contract test and response DTO lock (completed).
4. `POST /v1/messages/send` request/validation compatibility fix (open).
