# RBAC Second Pass Migration

## Scope Inventory (evidence)

### Summary counts
- Legacy request user access and legacy DB role helpers in runtime code (pre-pass): 109 references removed.
- Remaining legacy role references in runtime code: 0 references.
- Mixed identity references (`appUserId`, `clerkId`, `legacyUserId`, `users.id`) in API runtime: 184 references.

### Middleware and core
- `apps/api/src/middlewares/auth.ts:34-39` defines `req.context` with `appUserId`, `globalRole`.
- `apps/api/src/middlewares/auth.ts:153-163` resolves legacy user compatibility (`legacyUserId`, `legacyRole`, `legacyUsername`) from `users` by Clerk ID.
- `apps/api/src/middlewares/auth.ts:227-236` writes only `req.context` identity and role data. No `req.user` assignment remains.
- `apps/api/src/middlewares/auth.ts:289-341` permission and role middleware gate decisions by `req.context.globalRole` and permission matrix.
- `apps/api/src/logger.ts:18-19` now logs `appUserId` and `globalRole` instead of `req.user.id`.

### Controllers (legacy `req.user` usage removed)
- Events: `apps/api/src/app/events/events.controller.ts`
- Groups: `apps/api/src/app/groups/groups.controller.ts`
- Threads: `apps/api/src/app/threads/threads.controller.ts`
- Notifications: `apps/api/src/app/notifications/notifications.controller.ts`
- Messages: `apps/api/src/app/messages/messages.controller.ts`
- User: `apps/api/src/app/user/user.controller.ts`
- Moderation: `apps/api/src/app/moderation/moderation.controller.ts`
- Plus migrated controllers using actor identity from context compatibility field:
  - `apps/api/src/app/awareness/awareness.controller.ts`
  - `apps/api/src/app/blocks/blocks.controller.ts`
  - `apps/api/src/app/buddies/buddies.controller.ts`
  - `apps/api/src/app/collaboration/collaboration.controller.ts`
  - `apps/api/src/app/competitiveRecords/competitiveRecords.controller.ts`
  - `apps/api/src/app/diveSpot/diveSpot.controller.ts`
  - `apps/api/src/app/marketplace/marketplace.controller.ts`
  - `apps/api/src/app/profiles/profiles.controller.ts`
  - `apps/api/src/app/reports/reports.controller.ts`
  - `apps/api/src/app/safetyResources/safetyResources.controller.ts`
  - `apps/api/src/app/trainingLogs/trainingLogs.controller.ts`

### Services and policy branching
- Role checks migrated from legacy DB role helpers to global role checks:
  - `apps/api/src/app/events/events.service.ts`
  - `apps/api/src/app/groups/groups.service.ts`
  - `apps/api/src/app/threads/threads.service.ts`
- Remaining legacy role references: none

### Mixed identity hotspots (Clerk vs app user vs legacy user IDs)
- Request/auth context and mapping:
  - `apps/api/src/middlewares/auth.ts`
  - `apps/api/src/routes/auth.routes.ts`
  - `apps/api/src/routes/clerk-webhook.ts`
- Legacy schema-bound services still keyed on `users.id`:
  - `apps/api/src/app/messages/messages.service.ts`
  - `apps/api/src/app/reports/reports.service.ts`
  - `apps/api/src/app/moderation/moderation.service.ts`
  - `apps/api/src/app/groups/groups.service.ts`
  - `apps/api/src/app/events/events.service.ts`
  - `apps/api/src/app/threads/threads.service.ts`
  - `apps/api/src/app/buddies/buddies.service.ts`
  - `apps/api/src/app/userServices/userServices.service.ts`

## New Invariants
- `req.context` is the auth source of truth and must include:
  - `appUserId`
  - `globalRole`
  - `clerkUserId`
  - `status`
  - `effectivePermissions`
- Transitional compatibility (single adapter location):
  - `req.context.legacyUserId`
  - `req.context.legacyRole`
  - `req.context.legacyUsername`
- Controllers/services do not read `req.user`.
- Role gates in services/controllers use `globalRole` checks.
- Identity reveal action remains gated and audit logged:
  - `apps/api/src/middlewares/auth.ts:397-422`

## Refactor Batches

### Batch 1: request/auth middleware and context typing
Status: completed
- Removed `req.user` mutation and request typing.
- Added compatibility resolver in one place (`auth.ts`) to map Clerk to legacy identity for legacy-schema modules.
- Added authorization decision audit logging (allow and deny) in `requirePermission` and `requireGlobalRole` with actor role, actor appUserId, target IDs, and decision.

### Batch 2: controllers with legacy role branching
Status: completed
- Migrated all controller call sites from `this.request.user` to `this.request.context`.
- Admin checks moved to `globalRole` ranking in user/notification flows.

### Batch 3: services and policies
Status: completed for role branching
- Migrated role branching in `events`, `groups`, and `threads` services from legacy role helpers to global role checks.

### Batch 4: repositories and wrong identity usage
Status: partially complete by compatibility bridge
- Controller/service actor identity now enters through `req.context`.
- Full repo-layer switch to `app_users.id` is blocked by schema-level integer FK usage in legacy domain tables.

## Decision Needed

### Decision A: full `app_users.id` migration for legacy-domain tables
Problem
- Core domain tables and moderation/audit tables still reference `users.id` (integer), while RBAC context uses `app_users.id` (uuid).

Options
1. Keep compatibility adapter for this release (recommended short term)
- Keep `legacyUserId` resolved in `auth.ts` as the single bridge.
- Pros: low risk, no schema migration now, minimal regressions.
- Cons: mixed identity persists until DB migration.

2. Add explicit mapping column and dual-write bridge
- Add deterministic `app_users.id <-> users.id` mapping table/column and enforce referential integrity.
- Pros: safer staged migration, measurable progress.
- Cons: migration complexity and backfill work.

3. Full schema migration to UUID actor IDs
- Migrate legacy domain FK columns to uuid and remove `users.id` coupling.
- Pros: clean end-state, single identity model.
- Cons: highest risk, multi-release work, large data migration surface.

## Risks and Mitigations
- Risk: null `legacyUserId` on partially provisioned users.
- Mitigation: messages controller now rejects with explicit forbidden response when legacy identity is absent.

- Risk: authorization behavior drift during role migration.
- Mitigation: role checks use centralized `hasMinimumGlobalRole` and contract tests enforce `globalRole` usage.

- Risk: policy-sensitive actions missing audit consistency.
- Mitigation: `requirePermission` and `requireGlobalRole` now audit allow and deny decisions with actor and target context.

## Test Plan
- Type-check: `pnpm -C apps/api type-check`
- API tests: `pnpm -C apps/api test`

Coverage added/updated
- Updated: `apps/api/test/phase5-data-safety-contract.test.mjs`
- Added: `apps/api/test/rbac-second-pass-contract.test.mjs`
  - context invariants
  - no `req.user` mutation/usage
  - admin/forbidden role path via `globalRole`
  - blocked user behavior at auth boundary
  - golden-path thread authorization contract

## Rollout Plan
1. Deploy with compatibility adapter active in auth middleware.
2. Monitor authorization audit-log volume and denied-action spikes.
3. Verify privileged endpoints (`notifications`, `user delete`, moderation) in staging with member/admin personas.
4. Plan Decision A follow-up: schema migration roadmap from integer `users.id` to UUID `app_users.id` for legacy-domain tables.
