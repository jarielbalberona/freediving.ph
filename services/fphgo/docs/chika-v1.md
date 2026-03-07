# Chika v1 (`/v1/chika`)

## Routes

- `GET /v1/chika/categories`
- `GET /v1/chika/threads?category={slug}&cursor={cursor}&limit={n}`
- `POST /v1/chika/threads`
- `GET /v1/chika/threads/{threadId}`
- `GET /v1/chika/threads/{threadId}/comments?cursor={cursor}&limit={n}`
- `POST /v1/chika/threads/{threadId}/comments`

## Permissions

- `chika.read`: required for all reads.
- `chika.write`: required for thread/comment creates.
- `chika.moderate`: required to receive `realAuthorUserId` fields and hidden-item visibility.

## Pseudonymity

- Categories carry `pseudonymous` flag.
- Thread creation requires `categoryId`.
- If category is pseudonymous, thread mode is enforced as `pseudonymous`.
- Pseudonyms are stable per thread+author and returned as `authorDisplayName`.
- Members never receive real author identifiers for pseudonymous content.
- Moderators/admins with `chika.moderate` receive `realAuthorUserId`.

## Visibility And Blocks

- Hidden threads/comments are excluded from member lists/detail.
- Moderators can see hidden items with `isHidden` + `hiddenAt`.
- Block relationships are enforced for read and write:
  - blocked authors are filtered from thread/comment lists.
  - thread detail for blocked relationships returns not found.
  - comment/post/reaction writes against blocked thread authors are forbidden (`blocked`).

## Request/Response Notes

- `POST /threads` body:
  - `{ "title": "string", "categoryId": "uuid" }`
- `POST /threads/{threadId}/comments` body:
  - `{ "content": "string" }`
- `chika_comments.id` is BIGSERIAL and serialized as JSON string (`comment.id`).

## Reports Integration

- Reports resolve `chika_thread` and `chika_comment` targets to author ids through reports repository target resolution queries.

