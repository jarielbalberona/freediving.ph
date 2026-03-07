# Competitive Records Specification

## A) Purpose and Non-goals

### Purpose (MVP)
- Store and display structured competitive record entries with clear verification states.
- Allow member submissions and moderator/admin review decisions.
- Prevent post-verification tampering without explicit review workflow.

### Non-goals (MVP)
- No automatic ingest from AIDA, CMAS, or national body APIs.
- No ranking engine by federation standards.
- No legal adjudication workflow.

## B) User Stories

### MVP
- As a user, I can browse records by athlete, discipline, date, and competition name.
- As a member, I can submit a record with evidence placeholders.
- As a moderator/admin, I can mark record `verified` or `rejected` with reasons.
- As a user, I can clearly distinguish verified and unverified records.
- As a member, I can report suspicious records.

### Later
- As a verifier role holder, I can process verification without full moderator permissions.
- As admin, I can import historical records from trusted bodies.

## C) Data Model Draft

### Tables

| Table | Key columns | Relations | Uniqueness constraints | Indexes |
|---|---|---|---|---|
| `competitive_records` | `id`, `athlete_user_id`, `athlete_display_name_snapshot`, `discipline_code`, `metric_value`, `metric_unit`, `performed_at`, `competition_name`, `location_name`, `verification_state`, `state`, `submitted_by_user_id`, `verified_by_user_id`, `verified_at`, `rejected_reason`, `locked_after_verification`, `created_at`, `updated_at`, `deleted_at` | athlete -> app user optional on anonymized users | none in MVP | B-tree on `discipline_code`, `performed_at`; B-tree on `verification_state`, `state`; B-tree on `athlete_user_id` |
| `record_evidence` | `id`, `record_id`, `storage_key`, `evidence_type`, `source_url`, `mime_type`, `size_bytes`, `state`, `uploaded_by_user_id`, `created_at` | many-to-one -> `competitive_records` | none | B-tree on `record_id`, `state` |
| `record_reviews` | `id`, `record_id`, `reviewer_user_id`, `review_action`, `reason_code`, `notes`, `from_state`, `to_state`, `created_at` | many-to-one -> `competitive_records` | none | B-tree on `record_id`, `created_at`; B-tree on `reviewer_user_id` |
| `record_reports` | `id`, `record_id`, `reporter_user_id`, `reason_code`, `details`, `status`, `assigned_to_user_id`, `created_at`, `resolved_at` | many-to-one -> `competitive_records` | one open report per reporter+record+reason | B-tree on `status`, `created_at` |
| `record_audit_log` | `id`, `actor_user_id`, `actor_global_role`, `action`, `target_record_id`, `reason`, `metadata_json`, `created_at` | many-to-one -> `competitive_records` | none | B-tree on `target_record_id`, `created_at` |

### State fields
- `competitive_records.verification_state`: `unverified | pending | verified | rejected`.
- `competitive_records.state`: `visible | removed`.
- `record_evidence.state`: `active | removed`.
- `record_reports.status`: `open | triaged | actioned | dismissed`.

## D) API Contract Draft

### Endpoints

| Method | Route | Auth | Authorization checks | Pagination and filtering |
|---|---|---|---|---|
| `GET` | `/v1/competitive-records` | optional | Hide `removed` records for non-moderators | Query: `discipline`, `athleteUserId`, `athleteName`, `dateFrom`, `dateTo`, `competitionName`, `verificationState`, `limit`, `cursor`, `sort=performed_at|metric_value` |
| `GET` | `/v1/competitive-records/:id` | optional | Same visibility policy | none |
| `POST` | `/v1/competitive-records` | member | Active member only | Body submission payload, defaults to `unverified` |
| `PATCH` | `/v1/competitive-records/:id` | member | Submitter only and only when not `verified` | Mutable fields restricted |
| `POST` | `/v1/competitive-records/:id/request-review` | member | Submitter only when verified changes needed | Body describes correction request |
| `POST` | `/v1/competitive-records/:id/reports` | member | Active member only | Body reason/details |
| `POST` | `/v1/mod/competitive-records/:id/review` | moderator/admin | Role check required | Body: `action=mark_pending|verify|reject|remove`, reason required |

### Contract notes
- Verified records are locked from standard edit route.
- Review workflow is mandatory for post-verification corrections.
- Response payload always includes verification badge metadata for UI labels.

## E) UI Flows

### Screens
- Records list with filters.
- Record detail page with evidence placeholders.
- Submission form.
- Review request form for locked verified records.

### States
- Loading and empty list states.
- Badge states: `Verified`, `Pending Review`, `Unverified`, `Rejected`.
- Error state for invalid metric or unauthorized edits.
- Moderation action confirmation dialogs.

### Interaction flow
1. Member submits record with discipline and metric.
2. Record appears as `unverified` (or `pending` after moderator queue action).
3. Moderator reviews evidence and verifies or rejects.
4. If verified, record locks from direct edits.
5. Any correction attempt routes through review request.

## F) Abuse, Safety, and Privacy Considerations
- Unverified records must never be presented as official results.
- Verification and rejection require reason codes.
- Duplicate suspicious records are flagged for manual review.
- Moderation and verification actions are audit logged.
- Deleted user handling keeps performance data with anonymized athlete identity snapshot.

## G) Acceptance Criteria
- New submissions default to `unverified`.
- Verified badge is displayed only for `verification_state=verified`.
- Standard edit endpoint denies updates after verification lock.
- Post-verification correction uses review workflow endpoint.
- Reject and remove moderation actions require reason.
- Record list supports filtering by discipline, athlete, and date.
- Reports can be filed against records and enter moderation queue.
- Removed records do not appear in non-moderator listings.
- Audit logs capture all verification state transitions.
- Evidence metadata fields persist and validate according to placeholder policy.
