# 4.2 Messaging (Direct) - Implementation Plan

## Scope

Conversation list and direct messaging with attachments, rate limits, block handling, and moderator removals.

## Phase 0: Decision and Data Contracts

- Decide launch policy: Option A (DM anyone with limits) or Option B (buddy-first with message requests).
- Finalize `Conversation` and `Message` schema including message state placeholders.
- Define attachment policy (images only, max file size, scan pipeline).

## Phase 1: MVP

### Backend

- Create/get direct conversation endpoints.
- Send/list messages endpoints with pagination and unread counters.
- Enforce block rules and DM policy decision.
- Implement sender soft-delete state (`deleted_by_sender`).

### Frontend

- Conversation list with latest snippet and unread count.
- Message thread UI with optimistic send + failure recovery.
- Composer with image upload constraints.

### Acceptance

- Blocked users cannot message each other.
- Sender can delete own message and see deleted placeholder.
- Daily DM limits are enforced and user-visible.

## Phase 2: Safety and Moderation

- Add moderator message removal (`removed_by_moderator`) with reason code.
- Add abuse reporting on conversation and message levels.
- Add account-age gating (`<24h`) based on selected DM policy.

## Phase 3: Reliability

- Add delivery/read receipts (if needed).
- Add attachment malware/content scanning integration.
- Add spam heuristics and automated cool-down recommendations.

## Dependencies

- Depends on buddy system if Option B is selected.
- Requires shared block, reporting, and moderation infrastructure.
