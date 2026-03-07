# Reports v1

Last updated: 2026-02-27

## Purpose

Reports v1 provides a minimum moderation pipeline for member-submitted abuse reports and moderator triage with audit logging.

## Permissions

- `reports.write`: submit reports
- `reports.read`: moderator list/detail access
- `reports.moderate`: moderator status updates

## Data Model

### `reports`

- `id` UUID PK
- `reporter_app_user_id` UUID FK (`users.id`)
- `target_type` (`user | message | chika_thread | chika_comment`)
- `target_uuid` UUID nullable (used for `user | chika_thread`)
- `target_bigint` BIGINT nullable (used for `message | chika_comment`)
- DB CHECK ensures exactly one typed target column is set based on `target_type`
- `target_app_user_id` UUID nullable (resolved real author/subject)
- `reason_code` (`spam | harassment | impersonation | unsafe | other`)
- `details` text nullable
- `evidence_urls` JSONB nullable (array of URLs)
- `status` (`open | reviewing | resolved | rejected`)
- `created_at`, `updated_at`

### `report_events`

- `id` UUID PK
- `report_id` UUID FK to `reports.id` (`ON DELETE CASCADE`)
- `actor_app_user_id` UUID (reporter/mod/system actor)
- `event_type` (`created | status_changed | note_added`)
- `from_status`, `to_status`, `note` nullable
- `created_at`

## Endpoints

### Member

- `POST /v1/reports`
  - Auth: `RequireMember` + `reports.write`
  - Body:
    - `targetType`: `user | message | chika_thread | chika_comment`
    - `targetId`: string
    - `reasonCode`: `spam | harassment | impersonation | unsafe | other`
    - `details?`: string
    - `evidenceUrls?`: string[] (URL)
  - Response: `201` `{ "id": "<uuid>", "status": "open" }`

### Moderator

- `GET /v1/reports`
  - Auth: `RequireMember` + `reports.read`
  - Query:
    - `status?`, `targetType?`, `reporterUserId?`, `limit?`, `cursor?`
  - Response: `200` `{ "items": Report[], "nextCursor"?: string }`

- `GET /v1/reports/{reportId}`
  - Auth: `RequireMember` + `reports.read`
  - Response: `200` `{ "report": Report, "events": ReportEvent[] }`

- `PATCH /v1/reports/{reportId}/status`
  - Auth: `RequireMember` + `reports.moderate`
  - Body:
    - `status`: `reviewing | resolved | rejected`
    - `note?`: string
  - Response: `200` `{ "report": Report, "latestEvent"?: ReportEvent }`

## Service Policy

- Target validation and real author resolution are in the reports service:
  - `user`: validate user exists
  - `message`: resolve `messages.sender_user_id`
  - `chika_thread`: resolve `chika_threads.created_by_user_id`
  - `chika_comment`: resolve `chika_comments.author_user_id`
- Self-reporting is rejected for `targetType=user`.
- Cooldown: same reporter + same target can be reported once every 24 hours.
  - cooldown window is configurable in service constructor config.
- Daily cap: max 20 reports/day per reporter.
- Status transitions:
  - `open -> reviewing | resolved | rejected`
  - `reviewing -> resolved | rejected`
  - `resolved` and `rejected` are terminal.

## Error Contract

All errors use the shared envelope:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "issues": []
  }
}
```

Key codes:

- `validation_error` (`400`) with `issues[]`
- `unauthenticated` (`401`)
- `forbidden` (`403`)
- `not_found` (`404`)
- `rate_limited` (`429`) for cooldown/cap
