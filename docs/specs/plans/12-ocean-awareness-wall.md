# 4.12 Ocean Awareness Wall - Implementation Plan

## Scope

Awareness feed for environmental reminders and advisories with citation requirements.

## Phase 0: Content Policy Setup

- Define content type taxonomy (reminder, etiquette, advisory, tourism note).
- Define citation policy and misinformation enforcement workflow.
- Define moderation escalation for repeated misinformation.

## Phase 1: MVP

### Backend

- CRUD endpoints for awareness posts with optional link/citation fields.
- Read feed endpoint with pagination and topic filters.
- Role-based publish controls (member-posted or curated-only, to be decided).

### Frontend

- Awareness wall feed UI with source links and publish dates.
- Post composer (if member posting is enabled) with citation prompts.
- Report action on posts.

### Acceptance

- Factual claims include source links per policy.
- Moderators can remove misinformation and record reason.
- Feed remains focused on awareness/safety scope.

## Phase 2: Moderation and Integrity

- Add automated checks for missing citations on factual claim posts.
- Add repeat-offender policy actions.
- Add content quality dashboard (report rates, removals).

## Phase 3: Enhancements

- Add campaign-style themed collections (reef care month, etc).
- Add partnerships/official source badges.

## Dependencies

- Requires moderation/reporting and policy tooling.
