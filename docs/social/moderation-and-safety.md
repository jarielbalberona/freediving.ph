# Moderation and Safety (Shared) Spec

## Purpose
Define shared guardrails for all social modules: blocking, reporting, moderation actions, rate limits, audit logging, privacy, soft delete, and anonymization.

## Non-goals (MVP)
- No ML moderation pipeline.
- No automated legal workflow engine.
- No external trust score integrations.

## Blocking Rules
Blocking impacts all social modules immediately.

| Module | Block effect |
|---|---|
| Profiles | Blocked actor cannot view members-only/private fields of blocker |
| Messaging | No message requests, no sends, no receives between pair |
| Buddies | Pending requests canceled, new requests denied |
| Groups | No direct mention or direct interaction path between blocked users in group contexts |
| Chika | No direct reply/mention path between blocked users where applicable |

Hard rule: if either user blocks the other, interaction-deny wins.

## Reporting
Reportable target types:
- `profile`
- `message`
- `group`
- `chika_thread`
- `chika_post`

`reports` data contract:
- `id`, `reporter_user_id`, `target_type`, `target_id`, `reason_code`, `details`, `status`, `assigned_to_user_id`, `created_at`, `resolved_at`, `resolution`

Minimum statuses: `open | triaged | actioned | dismissed`.

## Moderation Actions
MVP action set:
- Warn user
- Remove content (message/post/thread/profile field)
- Lock thread
- Remove user from group
- Suspend user
- Shadowban user in Chika

All actions require:
- Actor authorization check
- Reason code
- Optional notes
- Audit log write

## Audit Log Requirements
`audit_log` required fields:
- `id`
- `actor_user_id`
- `actor_role`
- `action`
- `target_type`
- `target_id`
- `reason`
- `metadata` (JSON)
- `created_at`

`metadata` minimum:
- `request_id`
- `ip`
- `user_agent`
- `module`

Identity reveal attempts in Chika are always logged on allow and deny.

## Rate Limits (Starter Placeholders)
| Feature | Window | Limit | Notes |
|---|---|---|---|
| Profile updates | 1 hour | 20 | protect against profile spam |
| Buddy requests | 24 hours | 30 | new account tier lower |
| Message requests | 24 hours | 20 | new account tier lower |
| Messages sent | 1 minute | 30 | burst protection |
| Group creates | 24 hours | 3 | anti-spam guardrail |
| Chika thread creates | 1 hour | 10 | stricter in pseudonymous categories |
| Chika replies | 1 minute | 15 | anti-flood |
| Reports filed | 1 hour | 20 | abuse-resistant but not restrictive |

Account-age policy:
- `<7 days` uses stricter multipliers.
- Suspicious patterns can trigger temporary cooldowns.

## Privacy Controls
- Field-level visibility in profiles.
- Coarse location only unless explicit future policy changes.
- Members-only data excluded from anonymous responses.
- Moderator-only fields and actions never exposed in member payloads.

## Soft Delete and Anonymization
Soft delete baseline:
- Content is hidden from normal reads immediately.
- Content remains restorable within retention window if policy allows.
- Moderation holds override purge operations.

Anonymization baseline:
- Replace direct identifiers after retention policy conditions are met.
- Keep aggregate counts where possible without personal identifiers.
- Ensure anonymized records are not re-linkable via residual metadata.

## Acceptance Criteria
- Block action takes effect across messaging, buddies, groups, and chika without delay.
- Every moderation action writes an audit log with required metadata.
- Report creation works for all required target types.
- Rate-limit violations return deterministic error shape and retry guidance.
- Soft-deleted content is excluded from standard list/read endpoints.
- Anonymized records cannot be reverse-mapped to original identity via public APIs.
