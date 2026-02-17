# Social Module Specification (Canonical)

## Scope and Intent
This folder is the canonical product and engineering spec for the FPH Social module:
- Profiles
- Messaging
- Buddies
- Groups
- Forums (Chika)
- Shared moderation, safety, and RBAC

This spec is MVP-first and implementation-ready. Anything not listed as MVP is out of scope.

## Module Boundaries
| Module | Owns | Does Not Own |
|---|---|---|
| Profiles | User social identity fields, privacy visibility, profile media placeholders, profile stats placeholders | Dive log/records business logic, map discovery ranking |
| Messaging | 1:1 conversations, message requests, message retention states | Group chat, voice/video calls |
| Buddies | Buddy request lifecycle and active buddy relationships | Buddy Finder matching/ranking engine |
| Groups | Group entity, membership/roles, minimal group discussion feed | Full forum replacement across all categories |
| Chika | Forum categories, threads/posts, pseudonymous per-thread identity | Ocean Awareness Wall content policy workflows |
| Moderation and Safety | Blocking, reporting, sanctions, audit logging, rate-limit baselines | Non-social vertical-specific moderation logic |
| RBAC | Role and permission model plus enforcement points | Identity provider role source of truth |

## Cross-Module Invariants
1. Coarse location only by default. Never expose precise location in public APIs.
2. Blocking applies platform-wide. A block always overrides feature-level allow rules.
3. Reporting and moderation actions require audit logs.
4. Rate limits are enforced per feature and per actor identity.
5. Privacy controls are explicit and field-level where applicable.
6. Soft delete and anonymization rules are mandatory and consistent.

## Glossary
- Coarse location: location at city/region level, never exact coordinates.
- Members-only visibility: visible only to authenticated active members.
- Private visibility: visible only to the profile owner and moderators/admin where policy allows.
- Soft delete: content hidden from normal reads but retained for moderation, legal, and abuse workflows.
- Anonymization: irreversible removal or replacement of personal identifiers after retention window/policy conditions.
- Pseudonymous per-thread: stable alias inside one Chika thread, not linkable across threads by normal users.

## Doc Index
- `/Volumes/Files/softwareengineering/my-projects/freediving.ph/docs/social/profiles.md`
- `/Volumes/Files/softwareengineering/my-projects/freediving.ph/docs/social/messaging.md`
- `/Volumes/Files/softwareengineering/my-projects/freediving.ph/docs/social/buddies.md`
- `/Volumes/Files/softwareengineering/my-projects/freediving.ph/docs/social/groups.md`
- `/Volumes/Files/softwareengineering/my-projects/freediving.ph/docs/social/chika.md`
- `/Volumes/Files/softwareengineering/my-projects/freediving.ph/docs/social/moderation-and-safety.md`
- `/Volumes/Files/softwareengineering/my-projects/freediving.ph/docs/social/rbac.md`

## Implementation Plan
### Milestones
1. MVP (ship core social loops)
- Profiles with field-level privacy and coarse location.
- Buddies request lifecycle and active buddy list.
- Messaging 1:1 with message requests and block-aware delivery.
- Groups with membership roles and minimal discussion feed.
- Chika with category, thread, post, report, lock, and pseudonymous per-thread mode.
- Shared moderation baseline, audit logs, and starter rate limits.

2. Hardening (abuse resistance and operations)
- Tighten rate limits by account age and trust signals.
- Add moderation queue tooling and SLA states.
- Add retention jobs for soft-delete and anonymization workflows.
- Add reliability layer for message/event delivery and idempotency.

3. v1.1 (targeted expansion)
- Messaging read receipts and optional group chat.
- Group moderation analytics and automation hooks.
- Chika anti-abuse heuristics and stronger shadowban controls.
- Buddy Finder integration using buddies/privacy contracts.

### Ticket List
#### Backend
- Define and migrate social schema tables and indexes for all social modules.
- Implement profile read/write APIs with field-level visibility filtering.
- Implement buddy request state machine with transition guards.
- Implement messaging 1:1 APIs, request flow, retention states, and block checks.
- Implement groups APIs, role checks, membership lifecycle, and minimal feed endpoints.
- Implement Chika category/thread/post APIs, pseudonym allocator, and reveal identity endpoint.
- Implement shared report creation and moderation action endpoints.
- Implement audit log writer with strict schema and request metadata capture.
- Add per-route rate limit middleware and dynamic policy hooks.

#### Frontend
- Build profile page/edit flows with visibility controls and empty/error states.
- Build buddies inbox/sent/list flows and stateful action buttons.
- Build messaging inbox, request queue, thread screen, and composer guardrails.
- Build groups directory, detail page, member management, and minimal discussion UI.
- Build Chika category list, thread list, thread view, and moderation action affordances.
- Build reporting UI entry points for profile/message/group/thread/post.
- Build moderation console MVP views for reports and action history.

#### Infra
- Provision object storage paths for profile avatars and group images placeholders.
- Set up background workers for retention and anonymization jobs.
- Configure centralized structured logs and audit event ingestion.
- Configure metrics dashboards and alert thresholds for abuse spikes and API failures.

### Testing Plan
#### Unit
- Visibility policy evaluator by actor and field visibility.
- Buddy state transition validator for all legal and illegal transitions.
- Message request gating and block precedence logic.
- Chika pseudonym generation uniqueness and non-linkability rules.
- RBAC permission resolver and per-group role precedence.

#### Integration
- API contracts for each module route including authz and pagination.
- Blocking matrix across modules.
- Reporting and moderation action flows with audit log assertions.
- Soft-delete and restore/read behavior across profiles, messages, posts.

#### End-to-end
- New member creates profile, sends buddy request, gets accepted, starts DM.
- Member joins group, creates group post, report filed, moderator action taken.
- Chika thread in pseudonymous category with consistent per-thread alias.
- Moderator reveals pseudonymous identity and audit event is persisted.
- Suspended user cannot perform write actions but can view allowed reads based on status policy.

### Observability Plan
#### Product and system events
- `profile_updated`, `profile_visibility_changed`
- `buddy_request_created`, `buddy_request_accepted`, `buddy_removed`
- `message_request_created`, `message_sent`, `message_blocked_by_policy`
- `group_created`, `group_membership_changed`, `group_post_created`
- `chika_thread_created`, `chika_post_created`, `chika_thread_locked`
- `report_created`, `moderation_action_applied`, `identity_reveal_attempted`

#### Logs
- Structured request logs with `requestId`, actor, route, decision, latency.
- Policy decision logs for blocking, rate limit, and authz denials.
- Error logs with module tag and target resource IDs.

#### Metrics
- Request rate, p95 latency, error rate per social module.
- Rate-limit hit rate per endpoint and account-age cohort.
- Moderation queue depth and median time-to-action.
- Message send success rate and delivery lag by transport strategy.

#### Audit events
- Mandatory for moderation actions, role changes, and Chika identity reveal attempts.
- Include actor, action, target type/id, reason, timestamp, request metadata.
