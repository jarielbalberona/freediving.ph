# 4.3 Buddy System - Implementation Plan

## Scope

Buddy requests, acceptance/rejection/cancelation, active buddy list, and disconnect flow.

## Phase 0: Rules Engine

- Define lifecycle for `BuddyRequest` states and terminal transitions.
- Add rejection cooldown (14 days) rule.
- Enforce block overrides and duplicate-request prevention.

## Phase 1: MVP

### Backend

- Endpoints: send request, cancel, accept, reject, list incoming/outgoing, list active buddies.
- Create/maintain `BuddyRelationship` state on accept/remove.
- Add daily buddy request rate limits.

### Frontend

- Buddy request inbox and sent requests views.
- Buddy list screen and remove buddy action.
- Profile-level actions (`Add Buddy`, `Pending`, `Remove`).

### Acceptance

- Users cannot send requests when blocked or within rejection cooldown.
- Removing buddy disconnects relationship but does not block.

## Phase 2: Abuse Hardening

- Add abusive request reporting and moderation tools.
- Add throttling and anti-spam warning states for repeated actions.

## Phase 3: Enhancements

- Add buddy tags (training partner, instructor, etc) if needed.
- Add buddy recommendation hooks from shared region/interests.

## Dependencies

- Drives Buddy Finder visibility and may gate Messaging policy.
