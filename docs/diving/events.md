# Events Specification

## A) Purpose and Non-goals

### Purpose (MVP)
- Provide diving event discovery, creation, and RSVP tracking.
- Enforce visibility boundaries for public, members-only, and private events.
- Support moderation and organizer controls with audit trails.

### Non-goals (MVP)
- No payments or ticket sales.
- No calendar provider synchronization.
- No event chat thread ownership in this module.
- Capacity enforcement is optional and can be deferred.

## B) User Stories

### MVP
- As a user, I can browse events allowed by my auth and visibility status.
- As a member, I can create an event with date/time, location, and visibility.
- As a member, I can RSVP as going, interested, or not going.
- As an organizer, I can edit event details before event start and cancel events anytime.
- As a member, I can report abusive or scam events.
- As a moderator, I can remove or cancel abusive events and record reasons.

### Later
- As organizer, I can assign co-organizers.
- As organizer/moderator, I can lock event comments.
- As attendee, I can export calendar invitations.

## C) Data Model Draft

### Tables

| Table | Key columns | Relations | Uniqueness constraints | Indexes |
|---|---|---|---|---|
| `events` | `id`, `title`, `description`, `visibility`, `state`, `organizer_user_id`, `starts_at`, `ends_at`, `dive_site_id`, `custom_place_name`, `custom_latitude`, `custom_longitude`, `capacity`, `allow_waitlist`, `cancel_reason`, `canceled_at`, `created_at`, `updated_at`, `deleted_at` | organizer -> app user, optional site -> `dive_sites` | none | B-tree on `visibility`, `state`, `starts_at`; B-tree on `organizer_user_id`; optional GiST on custom location point |
| `event_rsvps` | `id`, `event_id`, `user_id`, `rsvp_state`, `created_at`, `updated_at` | many-to-one -> `events` | unique `(event_id, user_id)` | B-tree on `event_id`, `rsvp_state`; B-tree on `user_id` |
| `event_reports` | `id`, `event_id`, `reporter_user_id`, `reason_code`, `details`, `status`, `assigned_to_user_id`, `created_at`, `resolved_at` | many-to-one -> `events` | one open report per reporter+event+reason | B-tree on `status`, `created_at` |
| `event_audit_log` | `id`, `actor_user_id`, `actor_global_role`, `action`, `target_event_id`, `reason`, `metadata_json`, `created_at` | many-to-one -> `events` | none | B-tree on `target_event_id`, `created_at` |

### State fields
- `events.visibility`: `public | members_only | private`.
- `events.state`: `draft | published | canceled | removed`.
- `event_rsvps.rsvp_state`: `going | interested | not_going`.
- `event_reports.status`: `open | triaged | actioned | dismissed`.

## D) API Contract Draft

### Endpoints

| Method | Route | Auth | Authorization checks | Pagination and filtering |
|---|---|---|---|---|
| `GET` | `/v1/events` | optional | Visibility gating by actor, exclude removed | Query: `from`, `to`, `visibility`, `state`, `region`, `diveSiteId`, `limit`, `cursor`, `sort=starts_at|updated_at` |
| `GET` | `/v1/events/:id` | optional | Actor must satisfy visibility policy | none |
| `POST` | `/v1/events` | member | Active member only | Body create payload |
| `PATCH` | `/v1/events/:id` | member | Organizer only, editable before start except cancel path | mutable fields only |
| `POST` | `/v1/events/:id/cancel` | member | Organizer or moderator/admin | Body reason required |
| `POST` | `/v1/events/:id/rsvp` | member | Visibility and block checks for private/member contexts | Body: `rsvpState` |
| `POST` | `/v1/events/:id/reports` | member | Active member only | Body: reason/details |
| `POST` | `/v1/mod/events/:id/action` | moderator/admin | Role check | Body: `action=remove|cancel|warn_organizer`, reason required |

### Contract notes
- If linked to dive site, event location can reference site detail.
- For custom location, UI shows place name plus map pin with privacy-safe precision for private events.
- Organizer edit lock activates at `starts_at`.

## E) UI Flows

### Screens
- Events feed/list page with filters.
- Event detail page with RSVP controls.
- Event create/edit form.
- Organizer dashboard section for owned events.

### States
- Loading list/detail states.
- Empty list with create-event CTA for members.
- Access denied state for private events.
- Canceled event banner and disabled RSVP controls.
- Error and retry states for failed RSVP or update writes.

### Interaction flow
1. Organizer creates draft/published event.
2. Event becomes discoverable per visibility.
3. Members RSVP from detail page.
4. Organizer edits until start time.
5. Organizer or moderator cancels/removes when needed.

## F) Abuse, Safety, and Privacy Considerations
- Reporting must be available on every event detail page.
- Scam-like repetitive event creation is rate-limited and logged.
- Block rules suppress direct invite pathways and direct interaction prompts.
- Private event location display is reduced precision to avoid overexposure.
- Moderator actions and organizer forced-cancel actions are audited.

## G) Acceptance Criteria
- Guests see only `public` events.
- Members see `public` and `members_only` events, private only when eligible.
- Organizer can edit before `starts_at` and cannot edit restricted fields after start.
- RSVP enforces one state per user per event.
- Cancel sets event state and displays cancel reason in detail response.
- Removed events are excluded from normal list endpoints.
- Report creation works and enters moderation workflow.
- Moderator action endpoints require reason and role authorization.
- Event location rendering follows privacy precision policy.
- Audit log entries are created for cancel/remove/moderation actions.
