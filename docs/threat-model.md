# Threat Model And Abuse Model

Source of truth: `docs/specs/main.md` (FPH Feature Specification v1.1)

## Scope
- Focus threats: spam, harassment, doxxing, impersonation, scams, stalking through buddy finder, and pseudonymous Chika abuse.
- Includes code mitigations and moderation operations.

## Threats And Mitigations

### 1) Spam (mass posting, DM floods, request floods)
- Abuse patterns:
  - bulk buddy requests
  - DM conversation spam to non-buddies
  - thread/reply spam in Chika
- Code mitigations:
  - per-endpoint rate limiters (route level)
  - per-user daily limits in service layer for buddy requests, threads, replies, and non-buddy DM creation
  - account-age gates for higher-risk channels
- Moderation operations:
  - fast report triage for spam reason code
  - temporary feature restriction: disable DMs, disable Chika posting
  - repeat offender suspension

### 2) Harassment (targeted abuse in DM, Chika, groups)
- Abuse patterns:
  - repeated unwanted contact
  - hostile reply chains and pile-ons
- Code mitigations:
  - block graph enforcement in messaging and buddy requests
  - block-based filtering in buddy finder, profile visibility, and forum visibility
  - moderation remove actions with placeholders
- Moderation operations:
  - remove content with reason codes
  - lock heated threads
  - temporary/permanent suspension with audit trail

### 3) Doxxing (exposing personal info)
- Abuse patterns:
  - posting precise location, phone numbers, private details
- Code mitigations:
  - coarse location defaults in profile and discovery surfaces
  - content reporting pipeline and moderation removals
  - no exact location requirement for finder/event defaults
- Moderation operations:
  - immediate takedown and lock
  - escalate user action level for repeated violations

### 4) Impersonation (fake identity, fake authority)
- Abuse patterns:
  - pretending to be instructors/mods/known divers
  - abusing pseudonymous mode for identity confusion
- Code mitigations:
  - generated per-thread pseudonyms (not user-chosen by default)
  - pseudonym mapping isolated per thread
  - moderator/admin-only identity reveal path
- Moderation operations:
  - remove impersonation content
  - suspend accounts engaged in repeated impersonation

### 5) Scams (events, listings, DMs)
- Abuse patterns:
  - fake events, off-platform payment scams, phishing links
- Code mitigations:
  - report target coverage for event/message/content
  - moderation remove endpoints and reason codes
  - baseline account-age gate on messaging and posting paths
- Moderation operations:
  - event/listing/message removal
  - account restriction + audit log
  - repeat scammer ban

### 6) Stalking via buddy finder
- Abuse patterns:
  - tracking specific users by location/behavior
- Code mitigations:
  - buddy finder opt-out (`HIDDEN`)
  - block-based exclusion in finder results
  - coarse location fields only
- Moderation operations:
  - review stalking reports quickly
  - force-hide/disable discovery for abusive accounts

### 7) Pseudonymous Chika abuse
- Abuse patterns:
  - high-volume drive-by abuse from new accounts
  - harassment shielded by pseudonym
- Code mitigations:
  - account age gate for pseudonymous mode
  - stricter pseudonymous posting limits
  - moderator identity reveal only
- Moderation operations:
  - rapid remove and lock
  - temporary “Chika cooldown” feature restriction
  - escalation to suspension for repeated violations

## Operational Controls
- Moderator SLA:
  - harassment/doxxing: same-day response target
  - spam/scam: queue-based with priority escalation
- Auditability:
  - log all sensitive moderation actions
  - include reason code and actor identity
- Incident response:
  - preserve audit logs
  - produce moderation timeline for severe incidents

## Launch Blockers (Must Fix Before Production)
- Block rules not enforced across any one of: messaging, buddy requests, buddy finder, profiles, forums.
- Missing rate limits for core abuse vectors (buddy requests, DMs, threads/replies).
- Missing account-age gate for pseudonymous Chika and DM creation.
- Missing moderator fast-path actions (remove with reason, lock thread, suspend/restrict) with audit logs.
- Missing consistent error contract for authorization/validation failures.
- Any route that relies on client-only authorization.
