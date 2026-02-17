# Launch Blockers (Must Fix Before Production)

## Blockers

1. Unauthorized thread modification/deletion
- Finding IDs: `F-SEC-001`
- Why blocker: any authenticated user can alter or delete another user’s thread.

2. Group membership/post authorization bypass
- Finding IDs: `F-SEC-002`
- Why blocker: users can add/remove members and spoof post authorship without required role checks.

3. Event attendee spoofing and removal abuse
- Finding IDs: `F-SEC-003`
- Why blocker: users can register/cancel attendance for other users.

4. Notification object-level authorization missing
- Finding IDs: `F-SEC-004`
- Why blocker: cross-user notification data exposure/modification risk.

5. Pseudonymous Chika identity leakage
- Finding IDs: `F-PRIV-001`
- Why blocker: non-moderator users can see real identity fields in pseudonymous contexts, violating spec non-negotiable.

6. Coarse-location default not enforced
- Finding IDs: `F-PRIV-002`
- Why blocker: precise location can be stored/exposed in default flows, violating privacy requirement.

7. Blocking policy not enforced everywhere + no block CRUD
- Finding IDs: `F-PRIV-003`
- Why blocker: non-negotiable requires enforced blocking across messaging, buddy system, finder, and visibility boundaries.

8. Account deletion flow violates anonymize-first preference
- Finding IDs: `F-DATA-001`, `F-SEC-006`
- Why blocker: webhook hard delete conflicts with spec and risks community data integrity.

9. Global error handler misclassifies errors as CSRF
- Finding IDs: `F-REL-001`
- Why blocker: can mask real server failures and break operational response.

## Required operational runbooks before launch

1. Backup and restore runbook
- Scope: DB snapshot schedule, restore drill steps, RPO/RTO targets, credential handling.
- Evidence status: `Missing` in current repo.

2. Moderation actions runbook
- Scope: report triage, reason code usage, escalation, account suspension/reactivation, legal/safety handling.
- Evidence status: `Missing` in current repo.

3. Incident basics runbook
- Scope: severity matrix, on-call response, rollback steps, communication template, post-incident review checklist.
- Evidence status: `Missing` in current repo.

