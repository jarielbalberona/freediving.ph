# 4.6 Explore (Map + Discovery) - Implementation Plan

## Scope

Dive site exploration, map rendering, and community submissions with moderation review.

## Phase 0: Geodata and Privacy Rules

- Define `DiveSite` schema with coarse geodata standards.
- Define moderation states (`draft`, `published`, `flagged`, `removed`) lifecycle.
- Set coordinate precision and redaction policy for sensitive spots.

## Phase 1: MVP

### Backend

- Search/list endpoints by region/tags/recency.
- Dive site detail endpoint and media references.
- Submission endpoints for new sites and edit suggestions (default draft/pending).

### Frontend

- Explore list with filters and pagination.
- Dive site detail page with moderated safety notes.
- Map view with site pins, zoom, region filter, selected-site preview.

### Acceptance

- Guests can browse public sites; members-only sites gated.
- New submissions are not publicly visible until reviewed.
- Map pins use coarse location only.

## Phase 2: Review and Quality Controls

- Moderator workflow: approve/reject with feedback comments.
- Reporting/flagging for incorrect or risky dive site data.
- Add duplicate site detection on submission.

## Phase 3: Enhancements

- Add clustering and map performance optimizations.
- Add optional photo galleries with moderation queue.

## Dependencies

- Requires moderation tools and object-level visibility controls.
