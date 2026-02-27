# Moderation Visibility v1

## Purpose
Define visibility semantics for moderated Chika content and keep list endpoint behavior consistent for members and moderators.

## Content States
- `normal`
  - Meaning: content is active and visible.
  - Storage: `hidden_at IS NULL` and `deleted_at IS NULL`.
- `hidden`
  - Meaning: content is retained but hidden from regular members.
  - Storage: `hidden_at IS NOT NULL` and `deleted_at IS NULL`.
  - Trigger: moderation hide actions (`hide_thread`, `hide_comment`).
- `removed` (future hard-delete state)
  - Meaning: content permanently removed.
  - v1 status: not currently used for Chika records.
  - Planned storage model: physical delete or dedicated terminal state.

## Visibility Rules (v1)
- Member (`member` role):
  - Must not see hidden Chika threads/comments in list endpoints.
- Moderator/Admin/Super Admin (`moderator | admin | super_admin`):
  - Can see hidden Chika threads/comments in list endpoints.
  - Hidden rows must include explicit visibility markers.

## Response Contract Additions
Thread and comment response payloads expose:
- `is_hidden` (boolean)
- `hidden_at` (RFC3339 string, optional)
- `hidden_reason` (string, optional)

Notes:
- `hidden_reason` is optional and currently omitted by Chika list responses in v1.
- Source of truth for action rationale remains moderation audit records (`moderation_actions.reason`).

## Endpoint Behavior
- `GET /v1/chika/threads`
  - Member: filters out hidden threads.
  - Moderator/Admin/Super Admin: includes hidden threads with markers.
- `GET /v1/chika/threads/{threadId}/comments`
  - Member: filters out hidden comments.
  - Moderator/Admin/Super Admin: includes hidden comments with markers.

Posts do not currently have a hidden state in v1 and are unaffected by these rules.

## Data Retention
- Hidden content remains in database (soft visibility suppression, not deletion).
- Moderation actions are immutable audit events.
- Unhide clears `hidden_at` and restores normal visibility.

## Tests
Behavior is enforced by integration tests in:
- `internal/features/chika/http/integration_blocks_test.go`
  - `TestChikaReadHiddenContentMemberVsModerator`
    - Members do not receive hidden threads/comments.
    - Moderators receive hidden and visible items.
    - Moderator payloads include `is_hidden` and `hidden_at` markers for hidden rows.
