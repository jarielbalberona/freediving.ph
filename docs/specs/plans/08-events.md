# 4.8 Events - Implementation Plan

## Scope

Event listings and creation with visibility controls, organizer edit rules, and moderator intervention.

## Phase 0: State Rules

- Define event lifecycle (`draft`, `published`, `canceled`, `removed`).
- Encode organizer update boundary (editable until start time, then read-only except cancel).
- Define scam/abuse moderation criteria and reason codes.

## Phase 1: MVP

### Backend

- CRUD endpoints for events with role-aware access.
- List endpoints filtered by visibility and time ranges.
- Time-zone-safe handling for start/end comparisons.

### Frontend

- Event feed/listing with visibility-aware access.
- Event create/edit form with coarse location input.
- Event detail page with organizer and status indicators.

### Acceptance

- Guests only see public events.
- Organizer can edit before start and cancel after start.
- Moderators can remove abusive events.

## Phase 2: Moderation and Safety

- Add event reporting and moderator review queue.
- Add optional duplicate/scam signal checks (title similarity, repeated links).
- Add audit logs for moderator cancel/remove actions.

## Phase 3: Enhancements

- Add RSVP and attendance (if approved in future spec).
- Add calendar export and reminders.

## Dependencies

- Integrates with profile activity feed and moderation stack.
