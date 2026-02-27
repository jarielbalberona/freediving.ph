# Chika Item 2 — Manual Test Steps

**Base URL:** `http://localhost:8080` (or your API base)  
**Auth:** `Authorization: Bearer <clerk_session_jwt>` or `X-User-ID: <uuid>` (dev auth)

---

## 1. Read Endpoints (Require content.read + member)

### GET /v1/chika/threads
- **No auth:** 401
- **With auth:** 200, `{ "items": [...], "pagination": { "limit": 20, "offset": 0 } }`
- **Query:** `?limit=10&offset=0` — respects pagination
- **Query:** `?limit=200` — capped to 100 server-side

### GET /v1/chika/threads/{threadId}
- **Valid UUID, exists:** 200
- **Valid UUID, not found:** 404
- **Valid UUID, soft-deleted:** 404
- **Invalid UUID:** 400

### GET /v1/chika/threads/{threadId}/posts
- **Thread exists:** 200
- **Thread deleted:** 404
- **Query:** `?limit=5&offset=0`

### GET /v1/chika/threads/{threadId}/comments
- **Thread exists:** 200
- **Thread deleted:** 404

### GET /v1/chika/threads/{threadId}/media
- **Thread exists:** 200
- **Thread deleted:** 404

---

## 2. Write Endpoints (Require content.write + member)

### POST /v1/chika/threads
- **No auth:** 401
- **Suspended:** 403
- **read_only:** 403
- **Auth, no content.write (override):** 403
- **Valid:** 201, `{ "id", "title", "mode", "createdByUserId", "createdAt", "updatedAt" }`
- **Empty title:** 400
- **Invalid mode:** 400

### PATCH /v1/chika/threads/{threadId}
- **Non-owner, non-moderator:** 403
- **Owner:** 200
- **Moderator/admin/super_admin:** 200
- **Thread deleted:** 404

### DELETE /v1/chika/threads/{threadId}
- **Non-owner, non-moderator:** 403
- **Owner:** 200

### POST /v1/chika/threads/{threadId}/posts
- **Thread deleted:** 404
- **Valid:** 201
- **Empty content:** 400

### POST /v1/chika/threads/{threadId}/comments
- **Thread deleted:** 404
- **Valid:** 201

### PATCH /v1/chika/comments/{commentId}
- **Non-owner, non-moderator:** 403
- **Owner:** 200
- **Comment deleted:** 404

### DELETE /v1/chika/comments/{commentId}
- **Non-owner, non-moderator:** 403
- **Owner:** 200

### POST /v1/chika/threads/{threadId}/reactions
- **Thread deleted:** 404
- **Valid:** 200, `{ "threadId", "userId", "type" }`
- **Repeated POST same user:** 200, idempotent (no duplicate row)
- **Invalid type:** 400

### DELETE /v1/chika/threads/{threadId}/reactions
- **Thread deleted:** 404
- **Valid:** 200

### POST /v1/chika/media
- **Entity not found or deleted:** 404
- **Valid thread ref:** 201
- **Invalid entityType:** 400
- **Empty entityId:** 400

---

## 3. Break-It Scenarios

| # | Scenario | Expected |
|---|----------|----------|
| 1 | POST /threads without Bearer token | 401 |
| 2 | POST /threads with suspended account | 403 |
| 3 | POST /threads with read_only account | 403 |
| 4 | PATCH /threads/{id} as different user (non-moderator) | 403 |
| 5 | POST /threads/{deletedId}/posts | 404 |
| 6 | POST /threads/{deletedId}/reactions | 404 |
| 7 | POST /media with entityId of deleted thread | 404 |
| 8 | GET /threads/{deletedId}/posts | 404 |
| 9 | POST /threads/{id}/reactions twice (same user, same type) | 200 both, single row |

---

## 4. Pagination

- Default: `limit=20`, `offset=0`
- Max limit: 100 (server enforces)
- Ordering: `created_at DESC, id DESC` (stable)
