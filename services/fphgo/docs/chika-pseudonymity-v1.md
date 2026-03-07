# Chika Pseudonymity & Lifecycle Rules v1

## Pseudonym Assignment

### Rules

1. Each `chika_category` has a `pseudonymous` boolean flag.
2. When a thread is created in a pseudonymous category, its `mode` is set
   to `"pseudonymous"`.
3. Pseudonyms are **stable per thread + author**: the same user always
   appears as the same pseudonym within a given thread.
4. Algorithm: `HMAC-SHA256(secret, threadID + ":" + userID)` encoded in
   base32, truncated, with `anon-` prefix (for example `anon-K7M2Q9T4`).
5. In non-pseudonymous threads, the author's real `username` is used as
   the display name.

### Storage

- Pseudonyms are persisted in `chika_thread_aliases(thread_id, user_id, pseudonym)`
  and reused for all posts/comments in that thread.
- Pseudonyms for **comments** and **posts** are still stored in each row at
  creation time as immutable display snapshots.
- Pseudonyms for **thread authors** are derived at response time using
  the same algorithm — the thread table stores the real `created_by_user_id`.

### Thread Edits

- Only the thread `title` can be edited (by owner or moderator).
- The author pseudonym does not change on edit because it is derived from
  the immutable `threadID:userID` pair.
- The `updatedAt` timestamp is bumped on edit.

### Deleted Content (Soft Delete)

- Soft-deleted threads (`deleted_at IS NOT NULL`) are excluded from all
  list and detail queries.
- Soft-deleted comments (`deleted_at IS NOT NULL`) are excluded from all
  list and detail queries.
- Soft deletes are permanent in the sense that there is no un-delete in
  MVP. The row remains for audit.

## Response Fields by Viewer Role

### Thread Response

| Field              | Member                        | Moderator                     |
|--------------------|-------------------------------|-------------------------------|
| `authorDisplayName`| Pseudonym or username         | Pseudonym or username         |
| `realAuthorUserId` | *(omitted)*                   | Real user UUID                |
| `isHidden`         | Never true (hidden = 404)     | `true` / `false`              |
| `hiddenAt`         | *(omitted)*                   | RFC3339 timestamp             |

### Comment Response

| Field              | Member                        | Moderator                     |
|--------------------|-------------------------------|-------------------------------|
| `authorDisplayName`| Stored pseudonym              | Stored pseudonym              |
| `realAuthorUserId` | *(omitted)*                   | Real user UUID                |
| `isHidden`         | Never true (hidden excluded)  | `true` / `false`              |
| `hiddenAt`         | *(omitted)*                   | RFC3339 timestamp             |

Members never receive `realAuthorUserId` regardless of thread mode.
Moderators only receive `realAuthorUserId` when they explicitly request
`includeRealAuthor=true` and have `chika.reveal_identity` permission.

## Content Lifecycle States

| State    | DB columns                              | Member visibility | Moderator visibility |
|----------|-----------------------------------------|-------------------|----------------------|
| Normal   | `hidden_at IS NULL, deleted_at IS NULL` | Visible           | Visible              |
| Hidden   | `hidden_at IS NOT NULL`                 | Excluded / 404    | Visible + markers    |
| Deleted  | `deleted_at IS NOT NULL`                | Excluded / 404    | Excluded / 404       |

- **Hidden** content is excluded from member list endpoints and returns
  404 on detail. Moderators see hidden items in lists with `isHidden` and
  `hiddenAt` markers.
- **Deleted** content is universally excluded (even for moderators in
  list/detail endpoints). The row is retained for audit queries outside
  the API surface.

## Block Enforcement

### Reads
- Thread lists exclude threads created by blocked users (bidirectional).
- Comment/post lists exclude items authored by blocked users.
- Thread detail returns 404 when viewer has a block with the thread author.

### Writes
- Creating a post, comment, or reaction on a thread whose author has a
  block relationship with the actor returns `403 blocked`.
- Thread creation itself has no block check (it targets a category, not a
  user).

## Rate Limits

| Operation        | Limit     | Window |
|------------------|-----------|--------|
| Create thread    | 5         | 1 hour |
| Update thread    | 30        | 1 min  |
| Delete thread    | 20        | 1 min  |
| Create post      | 40        | 1 min  |
| Create comment   | 60        | 1 min  |
| Update comment   | 40        | 1 min  |
| Delete comment   | 30        | 1 min  |
| Set reaction     | 120       | 1 min  |
| Remove reaction  | 120       | 1 min  |

### Pseudonymous Thread Tightening

- `create_post`: 20/min on pseudonymous threads (`40/min` on normal threads)
- `create_comment`: 30/min on pseudonymous threads (`60/min` on normal threads)
- `set_reaction` (thread): 80/min on pseudonymous threads (`120/min` on normal threads)
- `set_comment_reaction`: 100/min on pseudonymous threads (`150/min` on normal threads)

### Identity Reveal Guardrails

- `realAuthorUserId` is no longer included by default in list/detail responses.
- To reveal IDs, pass query param `includeRealAuthor=true`.
- Reveal requests are permission-gated (`chika.reveal_identity`) and rate-limited:
  `30` requests per minute per moderator actor.

## Reports Integration

Reports can target `chika_thread` and `chika_comment` entity types. The
reports repository resolves the `target_app_user_id` (real author) from
these entity types, enabling moderators to act on pseudonymous content
without the identity leaking through the chika API surface.

## ID Contracts

- `chika_threads.id` is UUID (string in JSON).
- `chika_comments.id` and `chika_posts.id` are `BIGSERIAL`, serialized
  as strings in JSON responses.
