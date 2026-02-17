# Buddy Finder Specification

## A) Purpose and Non-goals

### Purpose (MVP)
- Allow members to publish time-bounded buddy availability using coarse area context.
- Provide safe discovery and request flows with anti-harassment controls.
- Integrate with block/privacy rules and message request gating.

### Non-goals (MVP)
- No real-time location sharing.
- No algorithmic compatibility score engine.
- No automatic certification verification from external agencies.

## B) User Stories

### MVP
- As a member, I can post availability with time window, area or dive site, skill tags, and notes.
- As a member, I can search for available buddies by area/site and time window.
- As a member, I can send a buddy request to a listing owner with safe cooldown and cap rules.
- As a listing owner, I can accept, decline, cancel, or hide my availability post.
- As a member, I can report abusive or spam listings.
- As a user, I do not see blocked users in discovery.

### Later
- As a member, I can attach verified certification badges.
- As a member, I can receive ranked recommendations based on past interactions.

## C) Data Model Draft

### Tables

| Table | Key columns | Relations | Uniqueness constraints | Indexes |
|---|---|---|---|---|
| `buddy_availability_posts` | `id`, `owner_user_id`, `state`, `starts_at`, `ends_at`, `area_region`, `area_province`, `area_municipality`, `near_dive_site_id`, `skill_tags_json`, `interest_tags_json`, `certification_tags_json`, `notes`, `visibility`, `created_at`, `updated_at`, `expired_at`, `deleted_at` | owner -> app user, optional site -> `dive_sites` | owner can have max 1 active post per overlapping time window | B-tree on `state`, `starts_at`, `ends_at`; composite on area fields; B-tree on `near_dive_site_id` |
| `buddy_finder_requests` | `id`, `post_id`, `from_user_id`, `to_user_id`, `state`, `message`, `created_at`, `updated_at`, `expires_at`, `responded_at`, `decline_reason` | many-to-one -> `buddy_availability_posts` | one active request per from/to/post | B-tree on `to_user_id`, `state`, `created_at`; B-tree on `from_user_id`, `created_at` |
| `buddy_finder_reports` | `id`, `post_id`, `reporter_user_id`, `reason_code`, `details`, `status`, `assigned_to_user_id`, `created_at`, `resolved_at` | many-to-one -> `buddy_availability_posts` | one open report per reporter+post+reason | B-tree on `status`, `created_at` |
| `buddy_finder_audit_log` | `id`, `actor_user_id`, `actor_global_role`, `action`, `target_type`, `target_id`, `reason`, `metadata_json`, `created_at` | references post/request | none | B-tree on `target_type`, `target_id`, `created_at` |

### Lifecycle states
- `buddy_availability_posts.state`: `active | expired | canceled | hidden`.
- `buddy_finder_requests.state`: `requested | accepted | declined | canceled | expired | blocked`.

## D) API Contract Draft

### Endpoints

| Method | Route | Auth | Authorization checks | Pagination and filtering |
|---|---|---|---|---|
| `GET` | `/v1/buddy-finder/posts` | member | Hide blocked users and users with privacy hidden; only `active` by default | Query: area fields, `nearDiveSiteId`, time range, `skillTags[]`, `limit`, `cursor` |
| `POST` | `/v1/buddy-finder/posts` | member | Active account required, one active overlap policy enforced | Body: availability payload |
| `PATCH` | `/v1/buddy-finder/posts/:id` | member | Owner only | Update allowed for mutable fields when `active` |
| `POST` | `/v1/buddy-finder/posts/:id/cancel` | member | Owner only | Sets `state=canceled` |
| `POST` | `/v1/buddy-finder/posts/:id/hide` | member | Owner only | Sets `state=hidden` |
| `POST` | `/v1/buddy-finder/posts/:id/requests` | member | Block, cooldown, and daily cap checks | Body optional intro message |
| `POST` | `/v1/buddy-finder/requests/:id/respond` | member | Recipient only | Body: `action=accept|decline` |
| `POST` | `/v1/buddy-finder/requests/:id/cancel` | member | Sender only when pending | none |
| `POST` | `/v1/buddy-finder/posts/:id/reports` | member | Active member only | Body: reason/details |
| `POST` | `/v1/mod/buddy-finder/posts/:id/action` | moderator/admin | Role check | Body: `action=hide|remove|warn_owner`, reason required |

### Contract notes
- Request creation triggers safe message-request thread only after `accepted`.
- Daily request caps and cooldown windows are in shared moderation spec and enforced server-side.
- From Explore site detail, optional `nearDiveSiteId` query lists nearby active posts with redacted owner details.

## E) UI Flows

### Screens
- Buddy Finder search list with filters.
- Availability composer and edit screen.
- Incoming/outgoing request inbox.
- Post card actions from Explore Dive Site detail.

### States
- Loading search results.
- Empty state with suggestion to broaden area/time.
- Blocked/unavailable state when interaction denied.
- Request pending/accepted/declined chips on cards.
- Error state for rate-limit or cooldown denial with retry timestamp.

### Interaction flow
1. User creates availability post with coarse area and time window.
2. Another user searches and sends request.
3. Recipient accepts or declines.
4. If accepted, messaging request is unlocked.
5. Post auto-expires after `ends_at` and leaves active search.

## F) Abuse, Safety, and Privacy Considerations
- Never expose live or precise location.
- Hide profile details beyond opt-in fields on listing cards.
- Enforce request cooldown after decline and daily request cap.
- Deny all interaction when either side has blocked the other.
- Provide report actions from search cards and detail context.
- Moderator actions require reason and audit event.
- Suspicious rapid targeting patterns trigger temporary cooldown.

## G) Acceptance Criteria
- Active posts only appear within requested area/time filters.
- Blocked users are excluded in both discovery directions.
- Request creation respects cap and cooldown policies.
- Request lifecycle transitions enforce legal state changes only.
- Accepted request is required before messaging initiation path.
- Hidden or canceled posts do not appear in default search.
- Expired posts transition out automatically without manual action.
- Reporting a post creates moderation queue item.
- No API response exposes precise user coordinates.
- All moderator and sensitive request state changes are audit logged.
