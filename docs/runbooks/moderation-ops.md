# Moderation Operations Runbook

## Scope
- Reports queue (`/reports`).
- Moderation actions (`/moderation`, feature-specific moderation endpoints).

## Reason code policy
- Allowed reason codes: `SPAM`, `HARASSMENT`, `DOXXING`, `IMPERSONATION`, `HATE`, `MISINFORMATION`, `SCAM`, `SAFETY`, `OTHER`.
- Every removal/restriction action must include reason and optional note.

## Triage flow
1. Confirm report target exists and current status.
2. Check prior reports and actor history.
3. Classify severity:
   - Critical: doxxing, direct threats, severe safety risk
   - High: harassment, hate, scam patterns
   - Normal: spam, low-risk policy violations
4. Apply action:
   - content remove/lock
   - feature restriction (`DM_DISABLED`, `CHIKA_POSTING_DISABLED`)
   - account suspension/reactivation
5. Ensure audit log entry exists for every action.

## Escalation
1. For safety/legal concerns, escalate to admin immediately.
2. Preserve references (report IDs, content IDs, actor IDs, timestamps).

## QA checklist after action
1. Removed content displays placeholder text.
2. Content is no longer publicly discoverable.
3. Audit log row created with actor, action, target, metadata.
