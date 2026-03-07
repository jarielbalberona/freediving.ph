# 4.1 Profiles - Implementation Plan

## Scope

Public profile, personal bests (PBs), and profile activity feed with visibility controls.

## Phase 0: Data and Policy Design

- Finalize schema for `Profile`, `PersonalBest`, and `ProfileActivityItem`.
- Enforce unique username and username change cooldown (30 days).
- Define visibility enforcement rules for guest/member views.
- Define feed eligibility rules (exclude private/removed/blocked content).

## Phase 1: MVP

### Backend

- CRUD endpoints for own profile and PBs.
- Read endpoint for profile by username with visibility filtering.
- Event hooks for feed item creation (`new_pb`, `joined_group`, `created_event`, `posted_chika_thread`, etc).
- Feed read endpoint with pagination and filter by visibility.

### Frontend

- Profile page with public/member-aware rendering.
- Profile edit form with avatar/bio/location/experience/home area.
- PB management UI with per-entry visibility selector.
- Profile activity section with clear visibility badges.

### Acceptance

- Guest sees only public profile and public PBs.
- Owner can manage PBs and profile visibility.
- Private PB never appears in feed.

## Phase 2: Moderation and Abuse Controls

- Add moderator actions for violating profile fields/PBs.
- Add placeholders and reason codes for removed feed items.
- Add anti-spam constraints on excessive profile updates (optional cooldown).

## Phase 3: Enhancements

- Add PB highlight pinning and sorting preferences.
- Add richer profile completeness insights.
- Add profile update history for moderation troubleshooting.

## Dependencies

- Requires cross-cutting auth, RBAC, block checks, and report tooling.
