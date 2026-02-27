# Buddies v1

## Purpose

Buddies are the trust primitive for social features. In v1 they support request lifecycle and buddy list management.

## Endpoints

Base path: `/v1/buddies`

- `POST /v1/buddies/requests`
  - body: `{ "targetUserId": "<uuid>" }`
  - auth: member + `buddies.write`
  - behavior: creates pending buddy request; idempotent for duplicate pending same-direction request.

- `GET /v1/buddies/requests/incoming`
  - auth: member + `buddies.read`
  - behavior: lists pending requests where actor is target.

- `GET /v1/buddies/requests/outgoing`
  - auth: member + `buddies.read`
  - behavior: lists pending requests where actor is requester.

- `POST /v1/buddies/requests/{requestId}/accept`
  - auth: member + `buddies.write`
  - behavior: target user accepts pending request, creates normalized buddy pair.

- `POST /v1/buddies/requests/{requestId}/decline`
  - auth: member + `buddies.write`
  - behavior: target user declines pending request.

- `DELETE /v1/buddies/{buddyUserId}`
  - auth: member + `buddies.write`
  - behavior: removes buddy relationship only.

- `GET /v1/buddies`
  - auth: member + `buddies.read`
  - behavior: lists buddy profile snippets for actor.

## Policy Rules

- Cannot request self.
- Cannot request if blocked either direction.
- Cannot accept if blocked either direction.
- Request creation is idempotent while same-direction pending request exists.
- Only target user can accept/decline request.
- Non-pending requests cannot be accepted/declined again.
- Suspended users are blocked globally by `RequireMember`.
- Read-only users are blocked from write methods by `RequireMember`.

## Data Model

### `buddy_requests`

- `id uuid primary key`
- `requester_app_user_id uuid not null`
- `target_app_user_id uuid not null`
- `status text` in `pending|accepted|declined|cancelled`
- `created_at timestamptz`
- `updated_at timestamptz`
- partial unique index: `(requester_app_user_id, target_app_user_id) where status='pending'`

### `buddies`

- `app_user_id_a uuid not null`
- `app_user_id_b uuid not null`
- `created_at timestamptz`
- primary key `(app_user_id_a, app_user_id_b)`
- invariant: `app_user_id_a < app_user_id_b`

## Error Cases

- `401 unauthenticated`: no identity
- `403 forbidden`: missing permission
- `403 blocked`: users are blocked
- `404 target_user_not_found`: request target does not exist
- `404 request_not_found`: request id does not exist
- `409 already_buddies`: users already buddies
- `409 request_already_pending`: reverse pending request already exists
- `409 invalid_state`: request not pending on accept/decline
- `400 validation_error`: invalid UUIDs or invalid request payload
