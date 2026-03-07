# Explore Dive Sites Specification

## A) Purpose and Non-goals

### Purpose (MVP)
- Provide map and list discovery for dive sites with viewport-driven marker loading.
- Support moderated community submissions and edit proposals.
- Deliver searchable and filterable dive site data with stable performance.

### Non-goals (MVP)
- No turn-by-turn navigation.
- No real-time weather, tide, or current telemetry.
- No trusted-editor program enforcement yet.
- No offline maps.

## B) User Stories

### MVP
- As a guest or member, I can browse dive sites on a map and list.
- As a user, I can search sites by name, municipality, province, or region.
- As a user, I can filter by area, difficulty, entry type, status, amenities, and hazards.
- As a user, I can pan/zoom map and see debounced viewport-based results.
- As a member, I can submit a new site that enters moderation review.
- As a member, I can report inaccurate or unsafe site content.
- As a moderator, I can verify, reject, flag, hide, or restore site visibility states.

### Later
- As a trusted editor, I can directly edit verified sites with post-hoc review.
- As a user, I can save favorite map filters and map position presets.

## C) Data Model Draft

### Tables

| Table | Key columns | Relations | Uniqueness constraints | Indexes |
|---|---|---|---|---|
| `dive_sites` | `id`, `name`, `slug`, `point_geom`, `latitude`, `longitude`, `municipality`, `province`, `region`, `description`, `best_season`, `entry_notes`, `depth_min_m`, `depth_max_m`, `current_notes`, `difficulty_level`, `entry_type`, `amenities_json`, `hazards_json`, `source_type`, `verification_state`, `visibility`, `moderation_reason`, `created_by_user_id`, `verified_by_user_id`, `created_at`, `updated_at`, `deleted_at` | creator -> app user | `slug` unique | GiST on `point_geom`; B-tree on `region`, `province`, `verification_state`, `updated_at`; GIN on searchable tsvector |
| `dive_site_edit_proposals` | `id`, `site_id`, `proposed_by_user_id`, `patch_json`, `state`, `moderation_reason`, `reviewed_by_user_id`, `reviewed_at`, `created_at` | many-to-one -> `dive_sites` | none | B-tree on `site_id`, `state`, `created_at` |
| `dive_site_media` | `id`, `site_id`, `storage_key`, `media_type`, `caption`, `state`, `uploaded_by_user_id`, `created_at` | many-to-one -> `dive_sites` | none | B-tree on `site_id`, `state` |
| `dive_site_reports` | `id`, `site_id`, `reporter_user_id`, `reason_code`, `details`, `status`, `assigned_to_user_id`, `created_at`, `resolved_at` | many-to-one -> `dive_sites` | one open report per reporter+site+reason | B-tree on `status`, `created_at`, `site_id` |
| `dive_site_audit_log` | `id`, `actor_user_id`, `actor_global_role`, `action`, `target_site_id`, `reason`, `metadata_json`, `created_at` | many-to-one -> `dive_sites` | none | B-tree on `target_site_id`, `created_at`; B-tree on `actor_user_id` |

### Moderation state fields
- `verification_state` on `dive_sites`: `draft | pending_review | verified | rejected | hidden | flagged`.
- `state` on `dive_site_edit_proposals`: `pending_review | approved | rejected | superseded`.
- `status` on `dive_site_reports`: `open | triaged | actioned | dismissed`.

## D) API Contract Draft

### Endpoints

| Method | Route | Auth | Authorization checks | Pagination and filtering |
|---|---|---|---|---|
| `GET` | `/v1/dive-sites/map` | optional | Non-moderators cannot read `hidden/rejected` sites | Query: `bounds`, `zoom`, `search`, `region`, `province`, `difficulty`, `entryType`, `status` (moderators only for full set), `amenities[]`, `hazards[]`, cursor pagination |
| `GET` | `/v1/dive-sites` | optional | Visibility filter by role | Query: `search`, `region`, `province`, `difficulty`, `entryType`, `status`, `sort=distance|area_distance|popularity|updated_at`, `limit`, `cursor` |
| `GET` | `/v1/dive-sites/:id` | optional | Same visibility and moderation gating as list | none |
| `POST` | `/v1/dive-sites` | member | Active member only, rate-limited, block-safe not required | Body create payload, returns `pending_review` by default |
| `POST` | `/v1/dive-sites/:id/edit-proposals` | member | Active member only | Body patch payload; one open proposal per user per site |
| `POST` | `/v1/dive-sites/:id/reports` | member | Active member only, reporter cannot be blocked by site owner policy is not applicable for site objects | Body: reason/details |
| `POST` | `/v1/mod/dive-sites/:id/review` | moderator/admin | Role check required | Body: `action=verify|reject|hide|flag|restore`, reason required |
| `POST` | `/v1/mod/dive-site-edit-proposals/:id/review` | moderator/admin | Role check required | Body: `action=approve|reject`, reason required |

### Contract notes
- `bounds` format: `minLng,minLat,maxLng,maxLat`.
- Viewport requests are debounced client-side at 250-400 ms.
- Distance sorting:
  - If location permission granted, client sends ephemeral coordinates in request only.
  - Server uses coordinates for response ordering but does not persist coordinates.
  - If no permission, sort by selected area centroid.

## E) UI Flows

### Screens
- Explore page with map and synchronized list panel.
- Dive site preview card on marker tap.
- Dive site detail page.
- Site submission form.
- Edit proposal form.

### States
- Loading: skeleton markers/list placeholders.
- Empty: no results in bounds with filter reset CTA.
- Error: API failure with retry.
- Partial: map renders with stale cache while refetching.

### Interaction flow
1. User lands on Explore with default Philippines viewport.
2. Frontend fetches marker clusters for current bounds/zoom.
3. User pans map and request debounces before refetch.
4. Marker tap opens preview card.
5. List item tap centers map and opens marker preview.
6. Optional list sort by distance if permission granted, else by area distance.

## F) Abuse, Safety, and Privacy Considerations
- Site content moderation required before public visibility for new submissions.
- Reports available for inaccurate, unsafe, spam, or duplicate site entries.
- `hidden` and `flagged` states remove site from standard discovery.
- No precise user location is shown anywhere in map/list UI.
- Distance feature does not store user coordinates.
- Rate limits on submissions, edit proposals, and reports.
- All moderation actions and sensitive state transitions must write audit logs.

## G) Acceptance Criteria
- Marker clustering works and updates correctly across zoom changes.
- Viewport query returns only sites in current bounds.
- Search matches name, municipality, province, and region fields.
- Filters combine correctly and return deterministic results.
- List item click recenters map and opens matching marker preview.
- Submission endpoint stores new sites as `pending_review`.
- Non-moderators cannot see `hidden` or `rejected` sites.
- Report submission creates a report record and audit entry.
- Distance sort works with client-granted location without persisting precise coordinates.
- Query latency for `/v1/dive-sites/map` stays within agreed SLO under expected load tests.
