# Chika Item 2: Core Social Write Path — Audit Report

**Project:** `freediving.ph/services/fphgo`
**Date:** 2025-02-27
**Scope:** Migration 0003, schema snapshot, chika feature (dto, routes, handlers, service, repo), app wiring, authz, correctness, performance, tests.

---

## 1. Schema Verification

### 1.1 New Tables/Columns/Indexes from 0003 Migration

| Item                                                              | Evidence                                                                                      |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `chika_threads`: mode, created_by_user_id, updated_at, deleted_at | `db/migrations/0003_core_social_write_path.sql` L3-7                                          |
| `chika_threads_mode_check`                                        | L9-17                                                                                         |
| `chika_posts`: updated_at, deleted_at                             | L19-21                                                                                        |
| `chika_comments` table                                            | L22-31: id, thread_id, author_user_id, pseudonym, content, created_at, updated_at, deleted_at |
| `chika_thread_reactions` table                                    | L33-40: PRIMARY KEY (thread_id, user_id), CHECK (reaction_type IN ('upvote', 'downvote'))     |
| `media_assets` table                                              | L42-55: entity_type, entity_id (TEXT), CHECK (entity_type IN ('thread', 'post', 'comment'))   |
| Partial indexes for soft-delete filtering                         | L57-60                                                                                        |

### 1.2 NOT NULL / Defaults / Foreign Keys / Unique Constraints

| Table                  | Field                     | Evidence                                                                                                                                                                                  |
| ---------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| chika_threads          | created_by_user_id        | Migration L5: nullable in 0003 (`ADD COLUMN ... created_by_user_id UUID REFERENCES`); schema L75: `NOT NULL` — **DRIFT**: schema snapshot shows NOT NULL, migration does not add NOT NULL |
| chika_threads          | deleted_at                | Nullable (soft delete) ✓                                                                                                                                                                  |
| chika_posts            | deleted_at                | Nullable ✓                                                                                                                                                                                |
| chika_comments         | thread_id, author_user_id | NOT NULL, FK ✓                                                                                                                                                                            |
| chika_comments         | deleted_at                | Nullable ✓                                                                                                                                                                                |
| chika_thread_reactions | (thread_id, user_id)      | PRIMARY KEY → unique ✓                                                                                                                                                                    |
| media_assets           | entity_type, entity_id    | NOT NULL, no FK to entity ✓                                                                                                                                                               |

### 1.3 Soft Delete Fields and Indexes

| Table          | deleted_at | Index                                                           |
| -------------- | ---------- | --------------------------------------------------------------- |
| chika_threads  | ✓ L7       | idx_chika_threads_created_at WHERE deleted_at IS NULL ✓         |
| chika_posts    | ✓ L21      | idx_chika_posts_thread_created_at WHERE deleted_at IS NULL ✓    |
| chika_comments | ✓ L31      | idx_chika_comments_thread_created_at WHERE deleted_at IS NULL ✓ |

---

## 2. API Surface Verification

### 2.1 Endpoint Registration

| Method | Path                          | Handler              | Evidence                                     |
| ------ | ----------------------------- | -------------------- | -------------------------------------------- |
| GET    | /threads                      | ListThreads          | `internal/features/chika/http/routes.go` L12 |
| GET    | /threads/{threadId}           | GetThread            | L13                                          |
| GET    | /threads/{threadId}/posts     | ListPosts            | L14                                          |
| GET    | /threads/{threadId}/comments  | ListComments         | L15                                          |
| GET    | /threads/{threadId}/media     | ListThreadMedia      | L16                                          |
| POST   | /threads                      | CreateThread         | L19 (write group)                            |
| PATCH  | /threads/{threadId}           | UpdateThread         | L20                                          |
| DELETE | /threads/{threadId}           | DeleteThread         | L21                                          |
| POST   | /threads/{threadId}/posts     | CreatePost           | L22                                          |
| POST   | /threads/{threadId}/comments  | CreateComment        | L23                                          |
| PATCH  | /comments/{commentId}         | UpdateComment        | L24                                          |
| DELETE | /comments/{commentId}         | DeleteComment        | L25                                          |
| POST   | /threads/{threadId}/reactions | SetThreadReaction    | L26                                          |
| DELETE | /threads/{threadId}/reactions | RemoveThreadReaction | L27                                          |
| POST   | /media                        | CreateMediaAsset     | L28                                          |

Mount point: `internal/app/routes.go` L55: `member.Mount("/v1/chika", chikahttp.Routes(deps.ChikaHandler))` → full path prefix `/v1/chika`.

### 2.2 DTOs vs Handler Expectations

| Handler           | Request DTO                                                                                         | Response           | Evidence                                 |
| ----------------- | --------------------------------------------------------------------------------------------------- | ------------------ | ---------------------------------------- |
| CreateThread      | CreateThreadRequest (title, mode)                                                                   | ThreadResponse     | handlers.go L32-48, dto.go L8-11, L43-50 |
| UpdateThread      | UpdateThreadRequest (title)                                                                         | ThreadResponse     | L93-110                                  |
| CreatePost        | CreatePostRequest (content)                                                                         | PostResponse       | L139-157                                 |
| CreateComment     | CreateCommentRequest (content)                                                                      | CommentResponse    | L193-209                                 |
| UpdateComment     | UpdateCommentRequest (content)                                                                      | CommentResponse    | L251-268                                 |
| SetThreadReaction | SetReactionRequest (type)                                                                           | ReactionResponse   | L302-317                                 |
| CreateMediaAsset  | CreateMediaAssetRequest (entityType, entityId, storageKey, url, mimeType, sizeBytes, width, height) | MediaAssetResponse | L343-368                                 |

Pagination: `parsePagination` (handlers.go L399-413) returns limit/offset; DTOs include `Pagination` in list responses ✓.

---

## 3. Authz and Policy Enforcement

### 3.1 content.write Required for Write Endpoints

| Claim                                                              | Evidence                                     |
| ------------------------------------------------------------------ | -------------------------------------------- |
| Write group uses `RequirePermission(authz.PermissionContentWrite)` | `internal/features/chika/http/routes.go` L18 |
| All write handlers (POST/PATCH/DELETE) are inside that group       | L19-28 ✓                                     |

### 3.2 Ownership Checks for Thread/Comment Mutations

| Operation       | Check                                | Evidence                                                                                                                              |
| --------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| UpdateThread    | owner or moderator/admin/super_admin | `internal/features/chika/service/service.go` L175-177: `thread.CreatedByUserID != input.ActorID && !isModeratorRole(input.ActorRole)` |
| DeleteThread    | same                                 | L201-203                                                                                                                              |
| UpdateComment   | owner or moderator                   | L315-317                                                                                                                              |
| DeleteComment   | same                                 | L339-341                                                                                                                              |
| isModeratorRole | moderator, admin, super_admin        | L344-346 ✓                                                                                                                            |

### 3.3 Moderator/Admin Bypass Safety

`isModeratorRole` returns true only for `moderator`, `admin`, `super_admin`. No privilege escalation path. ✓

### 3.4 Suspended and read_only Users

| Claim                                                 | Evidence                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| RequireMember blocks suspended (403)                  | `internal/middleware/clerk_auth.go` L85-88                                |
| RequireMember blocks read_only on write methods (403) | L90-93, `isWriteMethod` L166-171                                          |
| Chika mounted under member group                      | `internal/app/routes.go` L51-55: RequireMember runs before chika routes ✓ |

**PROVEN**: Suspended and read_only cannot reach write handlers.

### 3.5 401 vs 403 Consistency

- No identity → 401 (RequireMember, RequirePermission)
- Identity but suspended → 403 (RequireMember)
- Identity but read_only + write method → 403 (RequireMember)
- Identity but no content.write → 403 (RequirePermission)
- Identity, has permission, but not owner/moderator on update/delete → 403 (service layer)

✓ Consistent.

---

## 4. Correctness and Data Integrity Risks

### 4.1 Writes on Deleted Parents

| Operation            | Blocks if parent deleted? | Evidence                                                                                                       |
| -------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| CreatePost           | ✓                         | service.go L221-227: GetThread; repo GetThread filters `deleted_at IS NULL`                                    |
| CreateComment        | ✓                         | L263-269: same                                                                                                 |
| SetThreadReaction    | **NO**                    | Service does not call GetThread; repo upsert has FK to thread but thread row exists when soft-deleted. **GAP** |
| RemoveThreadReaction | **NO**                    | Same — FK allows delete. **GAP**                                                                               |
| CreateMediaAsset     | **NO**                    | No validation that entity exists or is not deleted. **GAP**                                                    |

### 4.2 Reads Exclude Soft-Deleted

| Query                                  | Excludes deleted? | Evidence                                                                                                  |
| -------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| ListThreads                            | ✓                 | repo L109-111: `WHERE deleted_at IS NULL`                                                                 |
| GetThread                              | ✓                 | repo L100-101                                                                                             |
| ListPosts                              | ✓ (posts)         | repo L165: `WHERE thread_id = $1 AND deleted_at IS NULL`                                                  |
| ListComments                           | ✓ (comments)      | repo L203                                                                                                 |
| GetComment                             | ✓                 | repo L226                                                                                                 |
| ListPosts when thread is deleted       | **NO**            | Service does not verify thread exists/not deleted. Direct call returns posts from deleted thread. **GAP** |
| ListComments when thread is deleted    | **NO**            | Same. **GAP**                                                                                             |
| ListThreadMedia when thread is deleted | **NO**            | Same. **GAP**                                                                                             |

### 4.3 Pagination Ordering and Caps

| Endpoint     | Ordering        | Tie-breaker | Max limit                                |
| ------------ | --------------- | ----------- | ---------------------------------------- |
| ListThreads  | created_at DESC | **NONE**    | 100 (handler L404), 100 (service L349) ✓ |
| ListPosts    | created_at DESC | **NONE**    | same ✓                                   |
| ListComments | created_at DESC | **NONE**    | same ✓                                   |

**GAP**: No `id` tie-breaker for stable ordering when `created_at` ties.

### 4.4 Referential Integrity

| Entity             | FK / Validation                                                           |
| ------------------ | ------------------------------------------------------------------------- |
| comments.thread_id | FK ✓                                                                      |
| media entity_id    | No FK; polymorphic. **GAP**: No validation that referenced entity exists. |

### 4.5 Reaction Upsert Concurrency

| Claim                                      | Evidence                                          |
| ------------------------------------------ | ------------------------------------------------- |
| PRIMARY KEY (thread_id, user_id)           | schema L109, migration L38 ✓                      |
| ON CONFLICT (thread_id, user_id) DO UPDATE | `internal/features/chika/repo/repo.go` L256-261 ✓ |
| Idempotent per (thread_id, user_id)        | ✓                                                 |

---

## 5. Performance Risks

### 5.1 N+1 Queries

ListThreads, ListPosts, ListComments: single query each. No N+1. ✓

### 5.2 Heavy Joins / Missing Indexes

- ListThreads: uses idx_chika_threads_created_at ✓
- ListPosts: uses idx_chika_posts_thread_created_at ✓
- ListComments: uses idx_chika_comments_thread_created_at ✓
- ListMediaByEntity: uses idx_media_assets_entity ✓

### 5.3 Unbounded Scans

All list endpoints use LIMIT/OFFSET. ✓

---

## 6. Test Coverage

### 6.1 Existing Tests Relevant to Chika

| Test File                                | Coverage                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `internal/middleware/clerk_auth_test.go` | RequireMember (401, suspended 403, read_only write 403), RequirePermission (401, 403) |
| `internal/shared/authz/authz_test.go`    | RolePermissions, ApplyOverrides, Identity.Can                                         |

**No chika-specific tests** (service, repo, handlers).

### 6.2 Missing Tests

- Unauthorized (401) on write endpoints
- Authenticated but no content.write (403)
- read_only attempting write (403)
- suspended attempting write (403)
- Ownership checks for thread/comment update/delete
- Deleted parent blocks child writes (post, comment, reaction, media)
- Reaction idempotency: repeated POST does not duplicate
- Pagination ordering and bounds
- Service policy matrix (owner vs non-owner vs moderator)

---

## 7. Actionable Fixes

### 7.1 Security (P0)

| Fix             | File(s) | Change                 |
| --------------- | ------- | ---------------------- |
| (None critical) | —       | Authz chain is correct |

### 7.2 Correctness (P1)

| Fix                                                              | File(s)      | Change                                                                                 |
| ---------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------- |
| Block writes on deleted thread                                   | service.go   | SetThreadReaction, RemoveThreadReaction: call GetThread first; return 404 if not found |
| Block CreateMediaAsset when entity missing/deleted               | service.go   | Validate entity exists and deleted_at IS NULL before insert                            |
| Block ListPosts/ListComments/ListThreadMedia when thread deleted | service.go   | Call GetThread first; return 404 if thread not found                                   |
| Add id tie-breaker to list ordering                              | repo/repo.go | `ORDER BY created_at DESC, id DESC` for threads, posts, comments                       |

### 7.3 Performance (P2)

| Fix    | File(s) | Change           |
| ------ | ------- | ---------------- |
| (None) | —       | Indexes adequate |

### 7.4 Style (P3)

| Fix    | File(s) | Change |
| ------ | ------- | ------ |
| (None) | —       | —      |

---

## 8. Acceptance Checklist

| Item                                                     | Status                                   |
| -------------------------------------------------------- | ---------------------------------------- |
| Migration 0003 + schema snapshot aligned                 | ✓ (minor created_by_user_id drift noted) |
| All read endpoints registered                            | ✓                                        |
| All write endpoints registered with content.write        | ✓                                        |
| Ownership + moderator checks on thread/comment mutations | ✓                                        |
| Suspended/read_only blocked on writes                    | ✓                                        |
| Soft-deleted excluded from reads                         | ✓ (threads, posts, comments)             |
| Writes blocked on deleted parents                        | ⚠ Post/Comment ✓; Reaction/Media ❌      |
| Pagination stable ordering                               | ⚠ No id tie-breaker                      |
| Pagination max limit                                     | ✓ 100                                    |
| Reaction upsert idempotent                               | ✓                                        |
| Media entity validation                                  | ❌                                       |
| Chika-specific tests                                     | ❌                                       |

---

## 9. Break-It Checklist

| Scenario                                                | Expected          | Why                                 |
| ------------------------------------------------------- | ----------------- | ----------------------------------- |
| POST /v1/chika/threads without auth                     | 401               | RequireMember                       |
| POST /v1/chika/threads with suspended                   | 403               | RequireMember                       |
| POST /v1/chika/threads with read_only                   | 403               | RequireMember                       |
| PATCH /v1/chika/threads/{id} as non-owner non-moderator | 403               | Service ownership check             |
| POST /v1/chika/threads/{deletedId}/posts                | 404               | GetThread returns no rows           |
| POST /v1/chika/threads/{deletedId}/reactions            | **Currently 200** | No thread existence check — **GAP** |
| POST /v1/media with entityId of deleted thread          | **Currently 201** | No validation — **GAP**             |
| GET /v1/chika/threads/{deletedId}/posts                 | **Currently 200** | No thread check — **GAP**           |
| Repeated POST /threads/{id}/reactions same user         | 200, idempotent   | Upsert ✓                            |

---

## 10. Post-Fix Status

### Fixes Applied (2025-02-27)

| Fix                                                                      | File(s)                                                 | Status |
| ------------------------------------------------------------------------ | ------------------------------------------------------- | ------ |
| Block writes on deleted thread (SetThreadReaction, RemoveThreadReaction) | `internal/features/chika/service/service.go`            | ✓      |
| Block CreateMediaAsset when entity missing/deleted                       | `internal/features/chika/service/service.go`            | ✓      |
| Block ListPosts/ListComments when thread deleted                         | `internal/features/chika/service/service.go`            | ✓      |
| Block ListThreadMedia when thread deleted                                | `internal/features/chika/http/handlers.go`              | ✓      |
| Add id tie-breaker to list ordering                                      | `internal/features/chika/repo/repo.go`                  | ✓      |
| EntityExists for media validation                                        | `internal/features/chika/repo/repo.go`                  | ✓      |
| HTTP tests: 401, 403 (no content.write, read_only, suspended)            | `internal/features/chika/http/routes_test.go`           | ✓      |
| Service tests: normalizePagination, isModeratorRole                      | `internal/features/chika/service/service_test.go`       | ✓      |
| Repo integration test: reaction idempotency                              | `internal/features/chika/repo/repo_integration_test.go` | ✓      |

### Updated Acceptance Checklist

| Item                                        | Status |
| ------------------------------------------- | ------ |
| Writes blocked on deleted parents           | ✓      |
| Pagination stable ordering (id tie-breaker) | ✓      |
| Media entity validation                     | ✓      |
| Chika-specific tests                        | ✓      |
