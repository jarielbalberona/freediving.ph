# API Compatibility Matrix: `apps/web` vs `services/fphgo`

Last updated: 2026-02-28

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
| `/v1/explore/sites` | `GET` | `exploreApi.listSites()` in `apps/web/src/features/diveSpots/api/explore-v1.ts` | `ListSites` in `services/fphgo/internal/features/explore/http/handlers.go` | `OK` |
| `/v1/explore/updates` | `GET` | `exploreApi.listLatestUpdates()` / `getExploreLatestUpdatesServer()` in `apps/web/src/features/diveSpots/api/explore-v1*.ts` | `ListLatestUpdates` in `services/fphgo/internal/features/explore/http/handlers.go` | `OK` |
| `/v1/explore/sites/{slug}` | `GET` | `exploreApi.getSiteBySlug()` in `apps/web/src/features/diveSpots/api/explore-v1.ts` | `GetSiteBySlug` in `services/fphgo/internal/features/explore/http/handlers.go` | `OK` |
| `/v1/explore/sites/{slug}/buddy-preview` | `GET` | `exploreApi.getSiteBuddyPreview()` / `getExploreSiteBuddyPreviewServer()` in `apps/web/src/features/diveSpots/api/explore-v1*.ts` | `GetBuddyPreviewBySlug` in `services/fphgo/internal/features/explore/http/handlers.go` | `OK` |
| `/v1/explore/sites/{slug}/buddy-intents` | `GET` | `exploreApi.getSiteBuddyIntents()` in `apps/web/src/features/diveSpots/api/explore-v1.ts` | `GetBuddyIntentsBySlug` in `services/fphgo/internal/features/explore/http/handlers.go` | `OK` |
| `/v1/explore/sites/{siteId}/save` | `POST` | `exploreApi.saveSite()` in `apps/web/src/features/diveSpots/api/explore-v1.ts` | `SaveSite` in `services/fphgo/internal/features/explore/http/handlers.go` | `OK` |
| `/v1/explore/sites/{siteId}/updates` | `POST` | `exploreApi.createUpdate()` in `apps/web/src/features/diveSpots/api/explore-v1.ts` | `CreateUpdate` in `services/fphgo/internal/features/explore/http/handlers.go` | `OK` |
| `/v1/buddy-finder/preview` | `GET` | `buddyFinderApi.preview()` in `apps/web/src/features/buddies/api/buddy-finder.ts` | `Preview` in `services/fphgo/internal/features/buddyfinder/http/handlers.go` | `OK` |
| `/v1/buddy-finder/intents` | `GET` | `buddyFinderApi.listIntents()` in `apps/web/src/features/buddies/api/buddy-finder.ts` | `ListIntents` in `services/fphgo/internal/features/buddyfinder/http/handlers.go` | `OK` |
| `/v1/buddy-finder/intents` | `POST` | `buddyFinderApi.createIntent()` in `apps/web/src/features/buddies/api/buddy-finder.ts` | `CreateIntent` in `services/fphgo/internal/features/buddyfinder/http/handlers.go` | `OK` |
| `/v1/buddy-finder/intents/{id}/message` | `POST` | `buddyFinderApi.messageEntry()` in `apps/web/src/features/buddies/api/buddy-finder.ts` | `MessageEntry` in `services/fphgo/internal/features/buddyfinder/http/handlers.go` | `OK` |
| `/v1/buddy-finder/intents/{id}/share-preview` | `GET` | `buddyFinderApi.getSharePreview()` / `getBuddyFinderSharePreviewServer()` in `apps/web/src/features/buddies/api/buddy-finder*.ts` | `SharePreview` in `services/fphgo/internal/features/buddyfinder/http/handlers.go` | `OK` |
| `/v1/me/saved` | `GET` | `profilesApi.getSavedHub()` in `apps/web/src/features/profiles/api/profiles.ts` | `GetSavedHub` in `services/fphgo/internal/features/profiles/http/handlers.go` | `OK` |
| `/v1/users/{userId}/save` | `POST` | `profilesApi.saveUser()` in `apps/web/src/features/profiles/api/profiles.ts` | `SaveUser` in `services/fphgo/internal/features/users/http/handlers.go` | `OK` |
| `/v1/users/{userId}/save` | `DELETE` | `profilesApi.unsaveUser()` in `apps/web/src/features/profiles/api/profiles.ts` | `UnsaveUser` in `services/fphgo/internal/features/users/http/handlers.go` | `OK` |
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
| `/v1/chika/categories` | `GET` | `threadsApi.getCategories()` in `apps/web/src/features/chika/api/threads.ts` | `ListCategories` in `services/fphgo/internal/features/chika/http/handlers.go` | `OK` |

## Per-Feature Breakdown

### Auth/Session

Web usage:
- Caller: `useSession()` (`apps/web/src/features/auth/session/use-session.ts:34`)
- Endpoint: `GET /v1/auth/session` via `routes.v1.me()` (`apps/web/src/lib/api/fphgo-routes.ts:5`)
- Request body type: none
- Expected response type (TS): shared `MeResponse` from `@freediving.ph/types` in `apps/web/src/features/auth/session/use-session.ts`

Go route:
- Route: mounted as `/v1/auth/session` in `services/fphgo/internal/features/auth/http/routes.go:7`
- Handler: `GetSession` in `services/fphgo/internal/features/auth/http/handlers.go:20`
- Required auth: `RequireMember` (from `services/fphgo/internal/app/routes.go:75`)

Compatibility notes:
- Shape is aligned and now consumed through shared `@freediving.ph/types` `MeResponse`.

### Explore, Conditions Pulse, and Site Buddy Matching

#### `GET /v1/explore/updates`

Web usage:
- Caller: `exploreApi.listLatestUpdates()` (`apps/web/src/features/diveSpots/api/explore-v1.ts`)
- Server caller: `getExploreLatestUpdatesServer()` (`apps/web/src/features/diveSpots/api/explore-v1.server.ts`)
- Request body type: none
- Expected response type (TS): `ExploreLatestUpdatesResponse`

Go route:
- Route: `/updates` in `services/fphgo/internal/features/explore/http/routes.go`
- Handler: `ListLatestUpdates` in `services/fphgo/internal/features/explore/http/handlers.go`
- Required auth: public

Compatibility notes:
- This is the Conditions Pulse feed used by `/explore/updates`. It includes author trust ladder fields and stays public-read safe.

#### `GET /v1/explore/sites/{slug}/buddy-preview`

Web usage:
- Caller: `exploreApi.getSiteBuddyPreview()` (`apps/web/src/features/diveSpots/api/explore-v1.ts`)
- Server caller: `getExploreSiteBuddyPreviewServer()` (`apps/web/src/features/diveSpots/api/explore-v1.server.ts`)
- Request body type: none
- Expected response type (TS): `ExploreSiteBuddyPreviewResponse`

Go route:
- Route: `/sites/{slug}/buddy-preview` in `services/fphgo/internal/features/explore/http/routes.go`
- Handler: `GetBuddyPreviewBySlug` in `services/fphgo/internal/features/explore/http/handlers.go`
- Required auth: public

Compatibility notes:
- Server-side redaction is aligned with the web preview usage on both the interactive sheet and the share page.

#### `GET /v1/explore/sites/{slug}/buddy-intents`

Web usage:
- Caller: `exploreApi.getSiteBuddyIntents()` (`apps/web/src/features/diveSpots/api/explore-v1.ts`)
- Request body type: none
- Expected response type (TS): `ExploreSiteBuddyIntentsResponse`

Go route:
- Route: `/sites/{slug}/buddy-intents` in `services/fphgo/internal/features/explore/http/routes.go`
- Handler: `GetBuddyIntentsBySlug` in `services/fphgo/internal/features/explore/http/handlers.go`
- Required auth: `RequireMember` + `RequirePermission(buddies.read)`

Compatibility notes:
- The response includes `sourceBreakdown` so the web can explain why some cards are site-linked and others are area fallback.

### Saved Hub and Buddy Share

#### `GET /v1/me/saved`

Web usage:
- Caller: `profilesApi.getSavedHub()` (`apps/web/src/features/profiles/api/profiles.ts`)
- Expected response type (TS): `SavedHubResponse`

Go route:
- Route: `/v1/me/saved` in `services/fphgo/internal/features/profiles/http/routes.go`
- Handler: `GetSavedHub` in `services/fphgo/internal/features/profiles/http/handlers.go`
- Required auth: member + `profiles.read`

Compatibility notes:
- Saved users are filtered for blocks in either direction. Hidden or deleted content is filtered out upstream.

#### `GET /v1/buddy-finder/intents/{id}/share-preview`

Web usage:
- Caller: `buddyFinderApi.getSharePreview()` / `getBuddyFinderSharePreviewServer()` (`apps/web/src/features/buddies/api/buddy-finder*.ts`)
- Expected response type (TS): `BuddyFinderSharePreviewResponse`

Go route:
- Route: `/intents/{id}/share-preview` in `services/fphgo/internal/features/buddyfinder/http/routes.go`
- Handler: `SharePreview` in `services/fphgo/internal/features/buddyfinder/http/handlers.go`
- Required auth: public

Compatibility notes:
- The response is intentionally redacted and filtered to active, non-expired, member-visible intents only.

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
- Body uses `categoryId` to drive category-based pseudonymity policy.

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
- `id` is string (BIGSERIAL serialized for web safety).

#### `GET /v1/chika/categories`

Web usage:
- Caller: `threadsApi.getCategories()` (`apps/web/src/features/chika/api/threads.ts`)
- Request body type: none
- Expected response type (TS): `ChikaCategoryListResponse`

Go route:
- Route: `/categories` in `services/fphgo/internal/features/chika/http/routes.go`
- Handler: `ListCategories` in `services/fphgo/internal/features/chika/http/handlers.go`
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
| `GET` | `/v1/explore/sites` | `explore.http.Handlers.ListSites` | Public |
| `GET` | `/v1/explore/sites/{slug}` | `explore.http.Handlers.GetSiteBySlug` | Public |
| `POST` | `/v1/explore/sites/{siteId}/updates` | `explore.http.Handlers.CreateUpdate` | `RequireMember` + `RequirePermission(explore.submit)` |
| `POST` | `/v1/explore/sites/{siteId}/save` | `explore.http.Handlers.SaveSite` | `RequireMember` + `RequirePermission(explore.submit)` |
| `DELETE` | `/v1/explore/sites/{siteId}/save` | `explore.http.Handlers.UnsaveSite` | `RequireMember` + `RequirePermission(explore.submit)` |
| `GET` | `/v1/buddy-finder/preview` | `buddyfinder.http.Handlers.Preview` | Public |
| `GET` | `/v1/buddy-finder/intents` | `buddyfinder.http.Handlers.ListIntents` | `RequireMember` + `RequirePermission(buddies.read)` |
| `POST` | `/v1/buddy-finder/intents` | `buddyfinder.http.Handlers.CreateIntent` | `RequireMember` + `RequirePermission(buddies.write)` |
| `DELETE` | `/v1/buddy-finder/intents/{id}` | `buddyfinder.http.Handlers.DeleteIntent` | `RequireMember` + `RequirePermission(buddies.write)` |
| `POST` | `/v1/buddy-finder/intents/{id}/message` | `buddyfinder.http.Handlers.MessageEntry` | `RequireMember` + `RequirePermission(buddies.write)` |
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

## Profiles And Blocks v1 Addendum (2026-02-27)

### Profiles v1 Truth Map

| Endpoint | Method | Web caller | Go handler | Status |
|---|---|---|---|---|
| `/v1/me/profile` | `GET` | `profilesApi.getMyProfile()` (`apps/web/src/features/profiles/api/profiles.ts:12`) via `routes.v1.profiles.me()` (`apps/web/src/lib/api/fphgo-routes.ts:26`) | `GetMeProfile` (`services/fphgo/internal/features/profiles/http/handlers.go:31`) mounted by `read.Get("/me/profile")` (`services/fphgo/internal/features/profiles/http/routes.go:15`) | `OK` |
| `/v1/me/profile` | `PATCH` | `profilesApi.updateMyProfile()` (`apps/web/src/features/profiles/api/profiles.ts:20`) via `routes.v1.profiles.me()` (`apps/web/src/lib/api/fphgo-routes.ts:26`) | `PatchMyProfile` (`services/fphgo/internal/features/profiles/http/handlers.go:47`) mounted by `write.Patch("/me/profile")` (`services/fphgo/internal/features/profiles/http/routes.go:22`) | `OK` |
| `/v1/profiles/{userID}` | `GET` | `profilesApi.getProfileByUserId()` (`apps/web/src/features/profiles/api/profiles.ts:16`) via `routes.v1.profiles.byUserId()` (`apps/web/src/lib/api/fphgo-routes.ts:27`) | `GetProfileByUserID` (`services/fphgo/internal/features/profiles/http/handlers.go:99`) mounted by `read.Get("/profiles/{userID}")` (`services/fphgo/internal/features/profiles/http/routes.go:16`) | `OK` |
| `/v1/users/search` | `GET` | `profilesApi.searchUsers()` (`apps/web/src/features/profiles/api/profiles.ts:27`) via `routes.v1.profiles.searchUsers()` (`apps/web/src/lib/api/fphgo-routes.ts:28`) | `SearchUsers` (`services/fphgo/internal/features/profiles/http/handlers.go:110`) mounted by `read.Get("/users/search")` (`services/fphgo/internal/features/profiles/http/routes.go:17`) | `OK` |

### Go Profile/Me Route Inventory

| Endpoint | Method | Source | Auth/Permission |
|---|---|---|---|
| `/v1/me` | `GET` | Mounted in `services/fphgo/internal/app/routes.go` to `auth.http.Handlers.GetSession` | `RequireMember` |
| `/v1/auth/session` | `GET` | Mounted in `services/fphgo/internal/app/routes.go:128` | `RequireMember` |
| `/v1/me/profile` | `GET` | Mounted from profiles router at `services/fphgo/internal/app/routes.go:115` and `services/fphgo/internal/features/profiles/http/routes.go:15` | `RequireMember` + `profiles.read` |
| `/v1/me/profile` | `PATCH` | Mounted from profiles router at `services/fphgo/internal/app/routes.go:115` and `services/fphgo/internal/features/profiles/http/routes.go:22` | `RequireMember` + `profiles.write` |
| `/v1/profiles/{userID}` | `GET` | Mounted from profiles router at `services/fphgo/internal/app/routes.go:115` and `services/fphgo/internal/features/profiles/http/routes.go:16` | `RequireMember` + `profiles.read` |
| `/v1/users/search` | `GET` | Mounted from profiles router at `services/fphgo/internal/app/routes.go:115` and `services/fphgo/internal/features/profiles/http/routes.go:17` | `RequireMember` + `profiles.read` |

### Blocks v1 Endpoints
| `/v1/blocks` | `GET` | `blocksApi.list()` in `apps/web/src/features/blocks/api/blocks.ts` | `ListBlocks` in `services/fphgo/internal/features/blocks/http/handlers.go` | `OK` |
| `/v1/blocks` | `POST` | `blocksApi.block()` in `apps/web/src/features/blocks/api/blocks.ts` | `CreateBlock` in `services/fphgo/internal/features/blocks/http/handlers.go` | `OK` |
| `/v1/blocks/{blockedUserId}` | `DELETE` | `blocksApi.unblock()` in `apps/web/src/features/blocks/api/blocks.ts` | `DeleteBlock` in `services/fphgo/internal/features/blocks/http/handlers.go` | `OK` |

### Policy Notes

- Profiles endpoints are scoped to `profiles.read`/`profiles.write` permissions.
- Blocks endpoints are scoped to `blocks.read`/`blocks.write` permissions.
- Messaging and chika enforce user block policy in service-driven read/write paths using `user_blocks`.
- Blocked write actions return `403` with `error.code = "blocked"` for:
  - `POST /v1/messages/send`
  - `POST /v1/messages/{conversationId}/accept`
  - `POST /v1/chika/threads/{threadId}/posts`
  - `POST /v1/chika/threads/{threadId}/comments`
  - `POST /v1/chika/threads/{threadId}/reactions`
- Blocked-read filtering is applied for:
  - `GET /v1/messages/inbox`
  - `GET /v1/messages/requests`
  - `GET /v1/chika/threads`
  - `GET /v1/chika/threads/{threadId}/posts`
  - `GET /v1/chika/threads/{threadId}/comments`
- Blocks list endpoint supports cursor pagination (`limit`, `cursor`) with stable ordering.

## Reports v1 Addendum (2026-02-27)

### New `/v1` Endpoints

| Endpoint | Method | Web caller | Go handler | Status |
|---|---|---|---|---|
| `/v1/reports` | `POST` | `reportsApi.createReport()` in `apps/web/src/features/reports/api/reports.ts` | `CreateReport` in `services/fphgo/internal/features/reports/http/handlers.go` | `OK` |
| `/v1/reports` | `GET` | Moderator triage (no web screen yet) | `ListReports` in `services/fphgo/internal/features/reports/http/handlers.go` | `OK` |
| `/v1/reports/{reportId}` | `GET` | Moderator triage (no web screen yet) | `GetReport` in `services/fphgo/internal/features/reports/http/handlers.go` | `OK` |
| `/v1/reports/{reportId}/status` | `PATCH` | Moderator triage (no web screen yet) | `UpdateStatus` in `services/fphgo/internal/features/reports/http/handlers.go` | `OK` |

### Policy Notes

- Submission endpoint is scoped to `reports.write`.
- Moderator list/detail is scoped to `reports.read`.
- Status updates are scoped to `reports.moderate`.
- Report create/status changes write audit events in `report_events`.
- Service layer enforces same-target cooldown (24h) and daily per-reporter cap.

## Moderation Actions v1 Addendum (2026-02-27)

### Web Route Wiring

- Route helpers added in `apps/web/src/lib/api/fphgo-routes.ts` under `routes.v1.moderation.*`.
- API caller wiring added in `apps/web/src/features/reports/api/reports.ts`:
  - `suspendUser`
  - `unsuspendUser`
  - `setUserReadOnly`
  - `clearUserReadOnly`
  - `hideThread`
  - `unhideThread`
  - `hideComment`
  - `unhideComment`

### Go Endpoint Inventory (Moderation)

| Method | Path | Handler | Auth requirement |
|---|---|---|---|
| `POST` | `/v1/moderation/users/{appUserId}/suspend` | `moderation_actions.http.Handlers.SuspendUser` | `RequireMember` + `RequirePermission(moderation.write)` |
| `POST` | `/v1/moderation/users/{appUserId}/unsuspend` | `moderation_actions.http.Handlers.UnsuspendUser` | `RequireMember` + `RequirePermission(moderation.write)` |
| `POST` | `/v1/moderation/users/{appUserId}/read-only` | `moderation_actions.http.Handlers.SetUserReadOnly` | `RequireMember` + `RequirePermission(moderation.write)` |
| `POST` | `/v1/moderation/users/{appUserId}/read-only/clear` | `moderation_actions.http.Handlers.ClearUserReadOnly` | `RequireMember` + `RequirePermission(moderation.write)` |
| `POST` | `/v1/moderation/chika/threads/{threadId}/hide` | `moderation_actions.http.Handlers.HideThread` | `RequireMember` + `RequirePermission(moderation.write)` |
| `POST` | `/v1/moderation/chika/threads/{threadId}/unhide` | `moderation_actions.http.Handlers.UnhideThread` | `RequireMember` + `RequirePermission(moderation.write)` |
| `POST` | `/v1/moderation/chika/comments/{commentId}/hide` | `moderation_actions.http.Handlers.HideComment` | `RequireMember` + `RequirePermission(moderation.write)` |
| `POST` | `/v1/moderation/chika/comments/{commentId}/unhide` | `moderation_actions.http.Handlers.UnhideComment` | `RequireMember` + `RequirePermission(moderation.write)` |

## Buddies v1 Addendum

Web callers (`apps/web/src/features/buddies/api/buddies.ts`) now target Go handlers under `/v1/buddies`:
- `GET /v1/buddies`
- `POST /v1/buddies/requests`
- `GET /v1/buddies/requests/incoming`
- `GET /v1/buddies/requests/outgoing`
- `POST /v1/buddies/requests/{requestId}/accept`
- `POST /v1/buddies/requests/{requestId}/decline`
- `DELETE /v1/buddies/{buddyUserId}`

Go handler package: `services/fphgo/internal/features/buddies/http`

Auth requirements:
- `RequireMember` on all buddies routes
- `buddies.read` for list/read endpoints
- `buddies.write` for create/accept/decline/remove endpoints

Compatibility notes:
- Web buddies API uses `fphgoFetchClient` and UUID string IDs.
- Response contracts are backed by shared types in `packages/types` (`BuddyRequest`, `IncomingBuddyRequestsResponse`, `OutgoingBuddyRequestsResponse`, `BuddyListResponse`).

## Explore v1 Addendum

Web callers (`apps/web/src/features/diveSpots/api/explore-v1.ts`) now target:
- `GET /v1/explore/sites`
- `GET /v1/explore/sites/{slug}`
- `POST /v1/explore/sites/{siteId}/save`
- `DELETE /v1/explore/sites/{siteId}/save`
- `POST /v1/explore/sites/{siteId}/updates`

Go handler package: `services/fphgo/internal/features/explore/http`

Compatibility notes:
- Explore is public-read, member-write.
- Share pages use the stable web path `/explore/sites/{slug}` backed by `GET /v1/explore/sites/{slug}`.
- Response contracts are now backed by shared `@freediving.ph/types` Explore DTOs.

## Buddy Finder v1 Addendum

Web callers (`apps/web/src/features/buddies/api/buddy-finder.ts`) now target:
- `GET /v1/buddy-finder/preview`
- `GET /v1/buddy-finder/intents`
- `POST /v1/buddy-finder/intents`
- `DELETE /v1/buddy-finder/intents/{id}`
- `POST /v1/buddy-finder/intents/{id}/message`

Go handler package: `services/fphgo/internal/features/buddyfinder/http`

Compatibility notes:
- Signed-out preview is public.
- Member intent routes use existing `buddies.read` / `buddies.write` permissions.
- Message entry returns the target user id for the existing messaging request flow; web then calls `POST /v1/messages/requests`.

## Messaging v1 Addendum

Web callers (`apps/web/src/features/messages/api/messages.ts`) now target:
- `GET /v1/messages/inbox`
- `POST /v1/messages/requests`
- `POST /v1/messages/requests/{requestId}/accept`
- `POST /v1/messages/requests/{requestId}/decline`
- `GET /v1/messages/conversations/{conversationId}`
- `POST /v1/messages/conversations/{conversationId}`
- `POST /v1/messages/read`

Go handler package: `services/fphgo/internal/features/messaging/http`

Compatibility notes:
- Conversation IDs are UUID strings.
- Message IDs are BIGSERIAL in Postgres but returned to web as strings.
- Inbox returns conversation-level items with status and pending request preview support.
- WebSocket event envelope is versioned (`v: 1`).
