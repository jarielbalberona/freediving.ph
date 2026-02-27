# Moderation Visibility v1

## Purpose
Define visibility semantics for moderated Chika content and keep endpoint behavior consistent for members and moderators.

## Content States

| State    | Storage                                        | Meaning                                     |
|----------|------------------------------------------------|---------------------------------------------|
| normal   | `hidden_at IS NULL` and `deleted_at IS NULL`   | Content is active and visible to all.        |
| hidden   | `hidden_at IS NOT NULL` and `deleted_at IS NULL`| Content retained but suppressed for members. |
| removed  | (future)                                       | Content permanently removed; not in v1.      |

- **normal** — Default state. Visible to everyone.
- **hidden** — Triggered by moderation hide actions (`hide_chika_thread`, `hide_chika_comment`). Content is retained in the database but invisible to regular members.
- **removed** — Planned terminal state for hard deletes. Not currently used for Chika records in v1.

## Visibility Rules

| Viewer role                          | Sees normal? | Sees hidden? | Markers on hidden? |
|--------------------------------------|:------------:|:------------:|:-------------------:|
| `member` / `trusted_member`          | yes          | no (404)     | n/a                 |
| `moderator` / `admin` / `super_admin`| yes          | yes          | yes                 |

A role is considered moderator-tier when it matches `moderator`, `admin`, or `super_admin`. All other roles (including empty/unknown) are treated as non-moderator.

## Response Contract Additions

Thread and comment response payloads expose three visibility fields:

| Field           | Type    | When present                                  |
|-----------------|---------|-----------------------------------------------|
| `is_hidden`     | boolean | Always. `true` when `hidden_at` is set.       |
| `hidden_at`     | string  | RFC 3339 timestamp. Omitted when not hidden.  |
| `hidden_reason` | string  | Optional. Currently omitted in v1 responses.  |

`hidden_reason` is reserved for future use. The authoritative rationale for any hide action is the `reason` field on the corresponding `moderation_actions` record.

## Endpoint Behavior

### List endpoints

- **`GET /v1/chika/threads`**
  - Member: filters out threads where `hidden_at IS NOT NULL`.
  - Moderator: includes all threads; hidden ones carry `is_hidden=true` and `hidden_at`.
- **`GET /v1/chika/threads/{threadId}/comments`**
  - Member: returns 404 if the parent thread is hidden. For a visible thread, individual hidden comments are filtered out.
  - Moderator: includes hidden comments with markers. Hidden parent thread is accessible.

### Detail / sub-resource endpoints

- **`GET /v1/chika/threads/{threadId}`**
  - Member: returns 404 if the thread is hidden.
  - Moderator: returns the thread with `is_hidden=true` and `hidden_at`.
- **`GET /v1/chika/threads/{threadId}/posts`**
  - Member: returns 404 if the parent thread is hidden.
  - Moderator: returns posts (posts do not have `hidden_at` in v1).
- **`GET /v1/chika/threads/{threadId}/media`**
  - Member: returns 404 if the parent thread is hidden.
  - Moderator: returns media for the thread.

Posts do not currently have a hidden state in v1. If a thread is hidden, its posts, comments, and media are all inaccessible to members.

## Data Retention

- Hidden content remains in the database (soft visibility suppression, not deletion).
- Moderation actions are immutable audit events in the `moderation_actions` table.
- Unhide clears `hidden_at` and restores normal visibility immediately.

## Database Support

- Columns: `chika_threads.hidden_at`, `chika_comments.hidden_at` (nullable `TIMESTAMPTZ`).
- Partial indexes optimize member queries:
  - `idx_chika_threads_visible_created_at` — `WHERE deleted_at IS NULL AND hidden_at IS NULL`
  - `idx_chika_comments_visible_thread_created_at` — `WHERE deleted_at IS NULL AND hidden_at IS NULL`

## Tests

Behavior is enforced by tests in `internal/features/chika/http/integration_blocks_test.go`:

- **`TestChikaReadHiddenContentMemberVsModerator`**
  - Members do not receive hidden threads/comments in list responses.
  - Moderators receive hidden and visible items.
  - Moderator payloads include `is_hidden` and `hidden_at` markers for hidden rows.
- **`TestChikaGetThreadHiddenVisibility`**
  - Members get 404 when requesting a hidden thread by ID.
  - Members get 404 for sub-resources (posts, comments, media) of a hidden thread.
  - Moderators get 200 with `is_hidden=true` and `hidden_at` for hidden threads.
  - Visible threads return `is_hidden=false` for all roles.
