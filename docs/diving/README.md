# Diving Module Specification (Canonical)

## Overview
This folder is the canonical diving spec for FPH v1.1 implementation.

Covered modules:
- Explore Dive Sites
- Buddy Finder
- Events
- Competitive Records
- Shared Moderation and Safety for diving modules

This spec is MVP-first and implementation-ready. Anything not marked MVP is out of scope.

## Module Boundaries
| Module | Owns | Does Not Own |
|---|---|---|
| Explore Dive Sites | Dive site discovery, map/list browsing, site submissions, site moderation lifecycle | User live location, turn-by-turn navigation, weather/ocean telemetry integrations |
| Buddy Finder | Availability posts, buddy request gating, safe discovery filters | Full messaging stack ownership, real-time GPS sharing, algorithmic matching marketplace |
| Events | Event lifecycle, visibility, RSVP states, organizer and moderator actions | Ticketing/payments, calendar provider sync, group chat ownership |
| Competitive Records | Structured record entries, verification workflow, immutable verified snapshots | Federation with AIDA/CMAS APIs in MVP, anti-doping policy systems |
| Moderation and Safety | Reports, block effects, anti-spam/rate limits, audit logs, soft delete, anonymization | Non-diving module policy ownership |

## Cross-Module Invariants
1. Coarse location by default for person-related features.
2. Blocking is global and deny-wins.
3. Reports and moderation actions require audit logs.
4. Rate limits are enforced with account-age and trust multipliers.
5. Soft delete and anonymization apply consistently across modules.
6. Privacy settings are explicit and enforced at read time.

## Glossary
| Term | Definition |
|---|---|
| Coarse area | Region, province, municipality, or named area without precise user coordinates |
| Dive site point | Public latitude/longitude for a place, not a person |
| Verification state | Moderation state attached to sites or records to signal trust |
| Message request gating | No direct chat until recipient accepts a request |
| Soft delete | Hide from normal reads while retaining for moderation/legal retention |
| Anonymization | Irreversible replacement of personal identifiers while preserving non-personal aggregates |

## Decision Records

### DR-001: Maps provider for map UI
Problem:
- Requirement says "Google Maps UI-like" but does not require Google Maps API.

Options compared:

| Provider | Cost model risk | Licensing and lock-in | Performance and rendering | SDK maturity (Next.js/React) | MVP verdict |
|---|---|---|---|---|---|
| Google Maps Platform | High risk at scale due to per-request billing and dynamic map costs | Proprietary, highest lock-in | Mature, strong global tiles, clustering libs available | Very mature | Not chosen for MVP |
| Mapbox | Medium-to-high cost risk depending on MAU and tile load | Proprietary API/terms, less lock-in than Google but still vendor-bound | Excellent vector performance and mobile UX | Very mature | Not chosen for MVP |
| MapLibre + self/managed tiles | Lowest variable API lock-in risk, predictable infra cost | Open-source client, lowest vendor lock-in | Good performance, depends on tile backend quality | Mature enough for web MVP | Chosen for MVP |

Decision:
- MVP uses MapLibre GL JS on frontend with OpenMapTiles-compatible vector tiles from a managed provider for faster launch.

Why:
- Meets map UX requirements without hard vendor lock-in.
- Lower long-term cost volatility versus usage-priced map APIs.
- Keeps migration path open if tile provider changes.

Consequence:
- We own more map integration details like style tuning and cluster behavior.
- We need tile provider SLA monitoring.

### DR-002: Geospatial query strategy
Problem:
- Need bounded map queries, distance sort behavior, and map clustering support.

Options compared:

| Option | Query capability | Complexity | Performance risk | MVP verdict |
|---|---|---|---|---|
| PostgreSQL only (numeric lat/lng + bounding box SQL) | Basic bounds and simple ordering | Low | Medium as data grows | Fallback only |
| PostgreSQL + geohash columns | Better bucket prefiltering | Medium | Medium | Fallback only |
| PostgreSQL + PostGIS | Native geospatial indexes, accurate distance and bounds ops | Medium | Low | Chosen for MVP |

Decision:
- MVP uses PostGIS (`geometry(Point,4326)`) with GiST indexes.

Why:
- Map viewport queries and distance sorting are first-class features.
- Bounding-box-only SQL is fragile for edge cases and degrades quickly at scale.

Fallback (if PostGIS unavailable in an environment):
- Use lat/lng decimal columns with bounding-box SQL and optional geohash prefix index.
- Limitations:
  - Less accurate distance ranking.
  - Higher false positives near bounding edges.
  - More application-side filtering and higher query cost.

### DR-003: Privacy boundaries for sites vs people
Problem:
- Dive sites are public places. Buddy/event participation is personal data.

Decision:
- Always public data:
  - Dive site coordinates and metadata (subject to site moderation state and visibility).
- Conditionally visible personal data:
  - Buddy Finder availability metadata (coarse area only).
  - Event attendee identity and RSVP state based on event visibility and user privacy settings.
- Never shown:
  - Exact user live location.
  - Precise device-derived coordinates for users.
  - Direct participant contact details unless explicit consent via accepted request/chat flow.

Policy detail:
- Distance is computed client-side using temporary device location when permission is granted.
- Server does not persist user precise coordinates for sorting.
- Without location permission, sort is based on selected area centroid, not user position.

## Document Index
- `/Volumes/Files/softwareengineering/my-projects/freediving.ph/docs/diving/explore-dive-sites.md`
- `/Volumes/Files/softwareengineering/my-projects/freediving.ph/docs/diving/buddy-finder.md`
- `/Volumes/Files/softwareengineering/my-projects/freediving.ph/docs/diving/events.md`
- `/Volumes/Files/softwareengineering/my-projects/freediving.ph/docs/diving/competitive-records.md`
- `/Volumes/Files/softwareengineering/my-projects/freediving.ph/docs/diving/moderation-and-safety.md`

## Implementation Plan

### Milestones

1. MVP
- Deliver Explore map/list with moderated site data and viewport-based queries.
- Deliver Buddy Finder availability and safe request flow with privacy guards.
- Deliver Events listing, creation, visibility controls, and RSVP states.
- Deliver Competitive Records submission, browsing, and verification states.
- Deliver shared moderation, reports, audit logs, and baseline anti-spam limits.

2. Hardening
- Add stronger abuse heuristics and trust-tiered rate limits.
- Add moderation queue tooling and SLA metrics.
- Add reliability hardening: idempotency keys, retry-safe write flows, background cleanup jobs.
- Add query optimization and cache tuning from production telemetry.

3. v1.1
- Add trusted editor workflow for dive sites.
- Add co-organizers and event comment locking.
- Add verifier scoped role for records.
- Add external records import placeholders (AIDA/CMAS) behind admin-only feature flags.

### Ticket List

#### Backend
- Add PostGIS extension and migration strategy for all environments.
- Create `dive_sites`, `dive_site_media`, `dive_site_reports`, `dive_site_audit` tables.
- Create `buddy_availability_posts`, `buddy_requests`, `buddy_finder_reports` tables.
- Create `events`, `event_rsvps`, `event_reports`, `event_audit` tables.
- Create `competitive_records`, `record_evidence`, `record_reviews`, `record_audit` tables.
- Build map/search endpoints with bounds, clustering, filters, pagination.
- Build buddy discovery and safe request endpoints with block/privacy checks.
- Build event CRUD + RSVP endpoints with visibility and organizer guards.
- Build record CRUD + review endpoints with immutable verified snapshots.
- Build shared report ingestion and moderation action endpoints.
- Enforce route-level and actor-level rate limits.
- Emit mandatory audit events for all moderation and sensitive state transitions.

#### Frontend
- Build Explore map page with marker clustering, site preview cards, list sync, and filter drawers.
- Build Explore site detail and submission/edit proposal forms.
- Build Buddy Finder browse screen, availability composer, and request state UI.
- Build Events list/detail/create/edit screens with RSVP controls and visibility handling.
- Build Competitive Records list/filter/submit pages and verification badges.
- Build report entry points and shared report modal patterns across all diving modules.
- Add React Query key strategy per module for cache correctness.
- Add optimistic UI only where state transitions are reversible and safe.

#### Infra
- Provision managed Postgres with PostGIS enabled across staging and production.
- Provision tile source service and CDN caching strategy for map assets.
- Provision object storage buckets and signed URL policy for media/evidence placeholders.
- Configure central structured logging and audit event sink.
- Configure rate-limit storage backend and fail-safe behavior.
- Add dashboards and alerts for abuse spikes, query latency, moderation backlog, and failed writes.

### Testing Plan

#### Unit tests

Explore Dive Sites (10 cases):
1. Bounds query includes only sites inside viewport polygon/envelope.
2. Cluster bucketing changes correctly by zoom level.
3. Search tokenizer matches site name, municipality, province, region.
4. Filter combinator handles status + difficulty + entry type correctly.
5. Hidden or removed sites never appear to non-moderators.
6. Distance formatter works without exposing precise user coordinates.
7. Site submission validation rejects invalid coordinates.
8. Moderation state transition guard rejects illegal transitions.
9. Duplicate detection heuristic scores near-identical sites.
10. Audit event payload generated for site moderation actions.

Buddy Finder (10 cases):
1. Availability auto-expires at end timestamp.
2. State transitions enforce `active -> expired/canceled/hidden` only.
3. Block relationship excludes both users from discovery results.
4. Coarse area serializer never returns precise coordinates.
5. Daily request cap denies requests after threshold.
6. Cooldown denies repeated requests after decline.
7. Message request gating prevents direct chat before acceptance.
8. Privacy setting `hidden` removes listing from search index.
9. Expired posts are excluded from default listing queries.
10. Audit metadata created for moderation actions on listings.

Events (10 cases):
1. Visibility filter excludes members-only/private for guests.
2. Organizer edit allowed before `startAt`, denied after `startAt` except cancel.
3. RSVP state machine allows one state per user per event.
4. RSVP write is idempotent on repeated same-state submission.
5. Capacity guard optional flag is ignored in MVP mode.
6. Block rules prevent invitations or direct RSVP nudges between blocked users.
7. Custom location privacy formatter redacts sensitive fields for private events.
8. Cancel action records reason and timestamp.
9. Report creation validates target existence and report reason.
10. Moderator remove action writes audit log with required fields.

Competitive Records (10 cases):
1. Discipline metric validator enforces proper unit/value ranges.
2. New records default to `unverified`.
3. Verified record becomes immutable to standard edit endpoint.
4. Post-verification changes require review workflow endpoint.
5. Reject action requires reason code.
6. Duplicate record detection flags same athlete+discipline+date+value.
7. Record visibility policy hides removed entries from public feeds.
8. Evidence metadata validation enforces allowed MIME and size placeholder policy.
9. Role check limits verification actions to moderator/admin in MVP.
10. Audit snapshot stores previous and new verification state.

#### Integration tests
- End-to-end API flow for each module write path with auth and authorization checks.
- Cross-module block matrix validation for buddy discovery, event interactions, and request flows.
- Report creation and moderation actions for all diving target types.
- Soft delete behavior across list/detail endpoints for all module entities.
- Anonymization transform validation for deleted users referenced in events and records.
- Pagination and cursor consistency under concurrent writes.
- Rate-limit enforcement and deterministic error schema by endpoint.
- PostGIS query correctness tests on representative Philippine geographic ranges.

#### E2E tests
- Explore map: apply filters, pan map, marker click opens preview, list synchronizes.
- Explore submission: member submits site, moderator verifies, public listing updates.
- Buddy Finder: member posts availability, another member requests, acceptance enables messaging request path.
- Events: organizer creates event, members RSVP, moderator cancels abusive event.
- Records: member submits record, moderator verifies, edit attempt routes to review flow.
- Shared abuse flow: report content from each module and resolve in moderation console.

### Observability

#### Product events
- `dive_site_viewed`, `dive_site_marker_opened`, `dive_site_submitted`, `dive_site_verified`
- `buddy_availability_posted`, `buddy_request_sent`, `buddy_request_accepted`, `buddy_request_blocked`
- `event_created`, `event_updated`, `event_rsvp_changed`, `event_canceled`
- `record_submitted`, `record_verified`, `record_rejected`, `record_review_requested`
- `report_created`, `moderation_action_applied`

#### Logs
- Structured request logs: `requestId`, actor, role, route, latency, status.
- Policy decision logs: authz deny, block deny, rate-limit deny, privacy redaction path.
- Geospatial query logs: bounds size, result count, execution latency bucket.

#### Metrics
- API p95 latency by module endpoint.
- Map query cache hit ratio and marker query throughput.
- Rate-limit hit ratio by endpoint and account-age cohort.
- Moderation queue depth and median time-to-action.
- Record verification turnaround time and rejection ratio.

#### Audit events
- Mandatory for moderation actions, verification transitions, organizer forced cancel, and privacy-sensitive state changes.
- Required fields: `actorAppUserId`, `globalRole`, `action`, `targetType`, `targetId`, `timestamp`, `reason`, `metadata`.
