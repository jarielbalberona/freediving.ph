# 4.10 Training Logs - Implementation Plan

## Scope

Private-first training sessions and metrics with optional sharing and controlled activity feed integration.

## Phase 0: Data Shape and Privacy Defaults

- Define `TrainingLogSession` and extensible `TrainingLogMetric` schema.
- Set default visibility to `private` and explicit sharing transitions.
- Define moderation policy for public unsafe advice.

## Phase 1: MVP

### Backend

- CRUD endpoints for training sessions and attached metrics.
- Visibility-aware read endpoints (`private`, `buddies_only`, `public`).
- Feed-event creation when logs are shared publicly/buddies.

### Frontend

- Session list and create/edit forms.
- Metric entry UI with key/value/unit extensibility.
- Visibility control and sharing preview.

### Acceptance

- New sessions default to private.
- Non-author users cannot read private logs.
- Shared logs create allowed activity items only.

## Phase 2: Moderation and Safety

- Add reportability for public training logs.
- Add moderation actions for unsafe/public policy-violating content.
- Add disclaimers in public log views.

## Phase 3: Enhancements

- Add trend charts (weekly/monthly aggregates).
- Add templates and repeat-session creation.

## Dependencies

- Depends on profile feed, buddy graph, and moderation/reporting foundation.
