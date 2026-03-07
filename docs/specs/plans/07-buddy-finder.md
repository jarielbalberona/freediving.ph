# 4.7 Buddy Finder - Implementation Plan

## Scope

Discover buddies by coarse region, experience level, and optional tags while respecting privacy and block rules.

## Phase 0: Eligibility and Index Design

- Define finder eligibility (`buddyFinderVisibility=visible`, account active).
- Build searchable index fields: region, experience level, tags.
- Add block-aware filtering contract for search results.

## Phase 1: MVP

### Backend

- Search endpoint with pagination and filtering.
- Enforce privacy and block exclusions.
- Add optional direct actions (`Send Buddy Request`) from results.

### Frontend

- Buddy finder page with filters and empty-state messaging.
- Profile cards with coarse info only (no exact location/schedule).
- Visibility toggle in profile settings.

### Acceptance

- Hidden users never appear in finder.
- Blocked relationships are excluded in both directions.
- Search results never expose precise location data.

## Phase 2: Abuse and Trust Controls

- Rate-limit repeated targeting queries.
- Add reporting for inappropriate profiles found in finder.
- Add anti-scraping safeguards (query caps, anomaly logging).

## Phase 3: Enhancements

- Add affinity scoring suggestions (shared area/interests).
- Add optional "looking for now" status with coarse recency.

## Dependencies

- Depends on profiles, block system, and buddy request APIs.
