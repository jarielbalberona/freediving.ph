# Diving Moderation and Safety Specification

## A) Purpose and Non-goals

### Purpose (MVP)
- Define shared moderation, anti-abuse, privacy, and retention controls across all diving modules.
- Enforce consistent report lifecycle, block effects, rate limits, and audit logging.
- Define soft delete and anonymization behavior for diving entities.

### Non-goals (MVP)
- No ML-driven auto-moderation.
- No external trust score vendor integration.
- No legal case management workflow.

## B) User Stories

### MVP
- As a member, I can report dive site, buddy listing, event, or record.
- As a moderator, I can triage reports and apply actions with reason codes.
- As a user, I expect blocks to remove interaction paths in diving modules.
- As a privacy-conscious user, I expect coarse location defaults and no precise leakage.

### Later
- As operations lead, I can tune adaptive limits through admin UI.
- As moderator, I can use automated duplicate/spam suggestions.

## C) Data Model Draft

### Shared moderation tables

| Table | Key columns | Relations | Uniqueness constraints | Indexes |
|---|---|---|---|---|
| `reports` | `id`, `reporter_user_id`, `target_type`, `target_id`, `reason_code`, `details`, `status`, `assigned_to_user_id`, `created_at`, `resolved_at`, `resolution_summary` | target polymorphic across diving modules | one open report per reporter+target+reason | B-tree on `target_type`, `target_id`; B-tree on `status`, `created_at` |
| `moderation_actions` | `id`, `actor_user_id`, `actor_global_role`, `action`, `target_type`, `target_id`, `reason_code`, `notes`, `metadata_json`, `created_at` | target polymorphic | none | B-tree on `target_type`, `target_id`, `created_at` |
| `audit_log` | `id`, `actor_app_user_id`, `global_role`, `action`, `target_type`, `target_id`, `timestamp`, `reason`, `metadata_json` | all sensitive actions | none | B-tree on `target_type`, `target_id`, `timestamp`; B-tree on `actor_app_user_id` |
| `rate_limit_counters` | `id`, `actor_user_id`, `bucket_key`, `window_start`, `count`, `trust_tier`, `account_age_days` | actor -> app user | unique `(actor_user_id,bucket_key,window_start)` | B-tree on `bucket_key`, `window_start` |

### Report target types
- `dive_site`
- `buddy_availability_post`
- `event`
- `competitive_record`

### Report lifecycle
- `open -> triaged -> actioned | dismissed`

## D) API Contract Draft

### Endpoints

| Method | Route | Auth | Authorization checks | Pagination and filtering |
|---|---|---|---|---|
| `POST` | `/v1/reports` | member | Active account, target must exist and be reportable | Body: `targetType`, `targetId`, `reasonCode`, `details` |
| `GET` | `/v1/mod/reports` | moderator/admin | Role check | Query: `status`, `targetType`, `assignedTo`, `limit`, `cursor` |
| `POST` | `/v1/mod/reports/:id/triage` | moderator/admin | Role check | Body: assignee and notes |
| `POST` | `/v1/mod/reports/:id/resolve` | moderator/admin | Role check | Body: `resolution=actioned|dismissed`, summary |
| `POST` | `/v1/mod/actions` | moderator/admin | Role check and reason required | Body: action payload for target |
| `GET` | `/v1/mod/audit-log` | moderator/admin | Role check and scope check | Query: actor, target, action, date range |

### Contract notes
- Every successful moderator action writes `moderation_actions` and `audit_log` entries.
- Every denied moderator action attempt writes an audit event with deny reason.
- Rate-limit deny responses must return retry hints.

## E) UI Flows

### Screens
- Report modal from each diving module detail card/page.
- Moderator queue page with status filters.
- Moderator action drawer with reason code selection.
- Audit trail screen for target entity history.

### States
- Report filed confirmation.
- Duplicate report warning.
- Moderator queue empty state.
- Permission denied state for non-moderator access.
- Rate-limit reached state with cooldown message.

### Interaction flow
1. Member files report from target content.
2. Report enters `open` queue.
3. Moderator triages and takes action or dismisses.
4. Action applies target state change.
5. Audit records persist actor, reason, metadata.

## F) Abuse, Safety, and Privacy Considerations

### Blocking effects across diving modules
| Module | Block effect |
|---|---|
| Explore Dive Sites | Site data remains visible if public, but blocked users cannot directly interact through linked personal actions (requests/messages) |
| Buddy Finder | Blocked users never appear in each other discovery results; existing pending requests auto-cancel |
| Events | Blocked users cannot directly invite/request direct interaction paths; RSVP visibility follows privacy rules |
| Competitive Records | Public record visibility remains unless removed, but profile linkage and direct interaction affordances are suppressed between blocked users |

### Starter rate limits (placeholders)
| Action | Window | Limit (base trust tier) | New account tier `<7 days` |
|---|---|---|---|
| Dive site submissions | 24h | 5 | 2 |
| Dive site edit proposals | 24h | 10 | 4 |
| Buddy finder requests | 24h | 20 | 8 |
| Buddy finder request burst | 1h | 8 | 3 |
| Event creation | 24h | 4 | 2 |
| RSVP writes | 1h | 30 | 15 |
| Record submissions | 24h | 10 | 4 |
| Report filings | 1h | 20 | 10 |

### Soft delete and anonymization
- Soft delete:
  - Immediately hide deleted dive content from standard reads.
  - Preserve for moderation and legal retention windows.
- Deleted user anonymization:
  - Buddy Finder: remove active listings and anonymize historical request references.
  - Events: keep event and RSVP counts, replace user identity with anonymized label where required.
  - Competitive Records: retain performance record with anonymized athlete snapshot if legal/policy permits.
- Hard delete only where required by policy/law.

## G) Acceptance Criteria
- All four diving target types are reportable from UI and API.
- Report lifecycle supports open, triaged, actioned, dismissed states.
- Every moderation action requires reason and writes audit log with mandatory fields.
- Block rules are enforced in buddy discovery and interaction flows.
- Rate-limit denials return deterministic error code and retry hint.
- Soft-deleted entities are excluded from standard read endpoints.
- Deleted user anonymization removes direct identifiers but preserves allowed aggregates.
- Moderator-only routes are inaccessible to non-moderator roles.
- Audit log includes `actorAppUserId`, `globalRole`, `action`, `target`, `timestamp`, `reason`, `metadata`.
- Privacy defaults prevent precise user location leakage in all diving modules.
