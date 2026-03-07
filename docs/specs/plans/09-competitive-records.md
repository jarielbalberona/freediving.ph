# 4.9 Competitive Records - Implementation Plan

## Scope

Browse and submit records with verification workflow and strict verified/unverified labeling.

## Phase 0: Verification Workflow Design

- Define `CompetitiveRecord` schema and validation constraints by discipline/unit.
- Define moderation states and verifier action audit requirements.
- Define display policy for unverified claims.

## Phase 1: MVP

### Backend

- Browse/search endpoints by discipline/event/date/athlete.
- Submission endpoint for members (default `unverified`).
- Verification endpoints for moderator/admin (`verify`, `reject`, `remove`).

### Frontend

- Records list and filter UI.
- Record submission form with optional source URL.
- Verified status badges and warning labels for unverified entries.

### Acceptance

- Member submissions are never marked verified by default.
- Verified records are clearly labeled and auditable.
- Unverified records are not presented as official.

## Phase 2: Data Quality and Moderation

- Add duplicate/suspicious submission checks.
- Add rejection reason communication to submitter.
- Add report action on records and source links.

## Phase 3: Enhancements

- Add linked-athlete profile integration.
- Add import tooling for historical verified records from trusted sources.

## Dependencies

- Requires moderation, audit logs, and robust validation primitives.
