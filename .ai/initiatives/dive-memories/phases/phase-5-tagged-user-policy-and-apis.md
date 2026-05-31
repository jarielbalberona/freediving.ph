# Phase 5: Tagged-User Policy And APIs

Status: passed

Allowed values: `pending`, `in_progress`, `repairing`, `passed`, `passed_with_issues`, `blocked`, `failed`.

Do not use `completed` or `done`.

## Goal

Implement tagged-user lifecycle and access policy for Dive Memories.

## Scope

- `dive_memory_tagged_users` repository/service behavior.
- Tag add/remove/accept/decline/hide APIs.
- Blocking and visibility enforcement.
- Tagged-memory management reads.
- Focused service/handler tests.

## Out Of Scope

- No notifications.
- No real-time updates.
- No mobile UI.
- No public follower visibility if unavailable.
- No public presentation of pending participation.

## Inputs

- Phase 1 privacy/blocking decision.
- Phase 3 memory APIs.
- Existing blocking/user lookup behavior.

## Tasks

- Create tags as `pending` by default.
- Prevent tagging blocked users.
- Prevent blocked users from accessing memories through tags.
- Implement accept, decline, and hide transitions.
- Suppress declined/hidden tags from public/tagged display.
- Expose pending tags only to the tagged user in management reads.
- Ensure tag lifecycle never unlocks map markers or increases visited-site counts.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_memories/...`
- `cd services/fphgo && go test ./internal/features/profiles/...`
- `git diff --check`

## Expected Evidence

- Pending tags are default.
- Declined/hidden tags suppress display.
- Blocked users cannot be tagged or access via tag.
- Tag acceptance does not mutate `user_dive_sites`, badges, Journey authority, or Passport source truth.

## Repair Policy

Allowed repairs: tag transition bugs, blocking checks, visibility filters, test setup.

Hard-stop on blocking ambiguity, tag display ambiguity, or privacy conflict.

## Completion Notes

Phase 5 passed on 2026-06-01. Added author-managed tag add/remove APIs, tagged-user pending/accepted/declined/hidden management reads/status updates, blocking checks for tag creation/access, and focused tests. Tag lifecycle remains non-proof and does not mutate `user_dive_sites`.
