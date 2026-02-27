# RBAC Foundation Audit Report

**Project:** `freediving.ph/services/fphgo`
**Date:** 2025-02-27
**Scope:** DB migration, schema, shared authz model, middleware pipeline, identity service/repo, enforcement, router wiring, tests.

---

## 1. What Matches the Claimed Spec (with Evidence)

### 1.1 DB Migration + Schema Snapshot

| Claim                                                                  | Evidence                                                                                                    |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `users.global_role` with check `member\|moderator\|admin\|super_admin` | `db/schema/000_schema.sql` L12-13: `CHECK (global_role IN ('member', 'moderator', 'admin', 'super_admin'))` |
| `users.account_status` with check `active\|read_only\|suspended`       | `db/schema/000_schema.sql` L13: `CHECK (account_status IN ('active', 'read_only', 'suspended'))`            |
| `user_permission_overrides` (JSONB)                                    | `db/schema/000_schema.sql` L108-112                                                                         |
| `group_memberships`, `event_memberships`                               | `db/schema/000_schema.sql` L114-136                                                                         |
| `groups`, `events` base tables                                         | `db/schema/000_schema.sql` L96-106                                                                          |
| Indexes for role/status and memberships                                | `db/schema/000_schema.sql` L143-146                                                                         |

Migration `db/migrations/0002_platform_foundation_rbac.sql` adds these via `ALTER TABLE` and `CREATE TABLE IF NOT EXISTS`; schema snapshot reflects the final state.

### 1.2 Shared RBAC Model

| Claim                             | Evidence                                 |
| --------------------------------- | ---------------------------------------- |
| Permission constants              | `internal/shared/authz/authz.go` L6-16   |
| `Identity` struct                 | `internal/shared/authz/authz.go` L18-25  |
| `Scope` struct                    | `internal/shared/authz/authz.go` L27-32  |
| `RolePermissions(role)`           | `internal/shared/authz/authz.go` L34-61  |
| `ApplyOverrides(base, overrides)` | `internal/shared/authz/authz.go` L63-72  |
| `Identity.Can(permission, scope)` | `internal/shared/authz/authz.go` L86-103 |

### 1.3 Middleware Pipeline

| Claim                                                        | Evidence                                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `AttachClerkAuth` verifies token, reads `sub`                | `internal/middleware/clerk_auth.go` L26-39; `CurrentAuth` uses `clerk.SessionClaimsFromContext` L118-124 |
| `AttachIdentityContext` resolves identity, stores in context | `internal/middleware/clerk_auth.go` L41-75                                                               |
| `CurrentIdentity`, `CurrentScope` in context                 | `internal/middleware/clerk_auth.go` L125-135                                                             |

### 1.4 Identity Service/Repo

| Claim                                                                                | Evidence                                                                                                  |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `EnsureUserForClerk` upserts by `(auth_provider='clerk', auth_provider_user_id=sub)` | `internal/features/identity/repo/repo.go` L28-77                                                          |
| Ensures profiles + overrides row                                                     | `internal/features/identity/repo/repo.go` L56-69                                                          |
| Loads role/status/overrides, builds effective permissions                            | `internal/features/identity/service/service.go` L21-50                                                    |
| Resolves scoped role from memberships when groupId/eventId exist                     | `internal/features/identity/service/service.go` L53-75; `internal/features/identity/repo/repo.go` L97-125 |

### 1.5 Enforcement Middleware

| Claim                                                                  | Evidence                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `RequireMember` blocks suspended                                       | `internal/middleware/clerk_auth.go` L85-88                           |
| `RequireMember` blocks writes when read_only                           | `internal/middleware/clerk_auth.go` L90-93, `isWriteMethod` L166-171 |
| `RequirePermission(permission)` uses `identity.Can(permission, scope)` | `internal/middleware/clerk_auth.go` L98-115                          |

### 1.6 Router Wiring Order

| Claim                                                         | Evidence                        |
| ------------------------------------------------------------- | ------------------------------- |
| Order: AttachClerkAuth → AttachIdentityContext → route mounts | `internal/app/routes.go` L46-58 |
| Protected group uses RequireMember + RequirePermission        | `internal/app/routes.go` L51-57 |

### 1.7 First Permission-Gated Endpoint

| Claim                                      | Evidence                                        |
| ------------------------------------------ | ----------------------------------------------- |
| `GET /v1/users/{id}` requires `users.read` | `internal/features/users/http/routes.go` L17-18 |
| `/v1/users/me` is member-only              | `internal/features/users/http/routes.go` L15-16 |

### 1.8 Tests + Drift

| Claim                  | Evidence                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `clerk_auth_test.go`   | `internal/middleware/clerk_auth_test.go` – tests RequireMember (401/204), RequirePermission (403)   |
| `schema_drift_test.go` | `db/schema_drift_test.go` – validates schema vs migrations, `global_role`/`account_status` presence |

---

## 2. What Does NOT Match (Gaps, Regressions, Inconsistencies)

### 2.1 Route Structure Mismatch

- **Claim:** `/v1/users/me` is member-only.
- **Reality:** `GetMe` uses `middleware.CurrentAuth` and `h.service.EnsureLocalUserForClerk` instead of `CurrentIdentity`. It does not use the identity from context for the response, though `RequireMember` still runs first and enforces auth. The handler duplicates user resolution logic; `EnsureLocalUserForClerk` (users repo) does not ensure `user_permission_overrides`, but `AttachIdentityContext` has already run `EnsureUserForClerk` (identity repo) before the handler, so overrides exist. **Minor inconsistency:** two separate “ensure user” implementations.

### 2.2 Scope Param Names – No Routes Use Them Yet

- **Claim:** Scope resolution when `groupId`/`eventId` params exist.
- **Reality:** Middleware extracts `chi.URLParam(r, "groupId")` and `chi.URLParam(r, "eventId")` (`internal/middleware/clerk_auth.go` L61-62). No routes define `{groupId}` or `{eventId}`. Scope resolution is **UNPROVEN** in real routes.

### 2.3 Migration 0002 Does Not Add Uniqueness for Clerk Users

- **Claim:** Uniqueness on `(auth_provider, auth_provider_user_id)`.
- **Reality:** That uniqueness comes from migration `0001_init.sql` L97: `idx_users_auth_provider_subject`. Migration 0002 does not add it; it is already present. **No regression.**

### 2.4 RequirePermission Does Not Check suspended/read_only

- `RequirePermission` only checks `identity.Can(permission, scope)`. It does not check `AccountStatus` or `IsReadOnly`.
- **Mitigation:** All current uses of `RequirePermission` are behind `RequireMember`, which blocks suspended and read_only on writes.
- **Risk:** If `RequirePermission` is ever used without `RequireMember`, suspended/read_only users could be allowed. **Footgun.**

### 2.5 Integration Test Expectation (Fixed)

- **Was:** After `goose up` then one `goose down`, test expected `users` table missing. With two migrations, one `down` left `users` from 0001.
- **Fix:** Test now uses `goose down-to 0` for full teardown (`db/migrations_integration_test.go`).

---

## 3. Security Risks / Abuse Cases

### 3.1 Suspended User Bypass (Mitigated)

- **Scenario:** Attacker with suspended account tries to access protected routes.
- **Step-by-step:** 1) Valid Clerk token. 2) AttachIdentityContext resolves identity with `account_status=suspended`. 3) RequireMember runs, returns 403.
- **Verdict:** Blocked by RequireMember (`clerk_auth.go` L85-88).

### 3.2 read_only User Writes (Mitigated)

- **Scenario:** read_only user attempts POST/PUT/PATCH/DELETE.
- **Step-by-step:** 1) Valid token. 2) RequireMember runs. 3) `isWriteMethod` true → 403.
- **Verdict:** Blocked (`clerk_auth.go` L90-93).

### 3.3 Override Abuse

- **Scenario:** Attacker manipulates `user_permission_overrides` JSONB to grant `users.manage`.
- **Step-by-step:** Requires DB write access. If an attacker can write to the DB, RBAC is already bypassed.
- **Verdict:** Overrides are server-side only; no client-controlled override input. **Low risk** assuming DB is protected.

### 3.4 Missing RequireMember Before RequirePermission

- **Scenario:** New route uses only `RequirePermission(users.read)` without `RequireMember`.
- **Step-by-step:** Suspended user with override granting `users.read` could pass.
- **Verdict:** **Footgun.** Document that `RequirePermission` must always be used with `RequireMember`, or add status checks into `RequirePermission`.

### 3.5 POST /v1/users Without Auth

- **Scenario:** `POST /v1/users` (CreateUser) is under the auth group.
- **Reality:** `AttachClerkAuth` verifies token; failure returns 401. So CreateUser requires a valid Clerk token.
- **Note:** CreateUser creates a local user (username, display_name, bio) with `auth_provider='local'` default. It does not use the Clerk token. Design intent unclear; possible confusion between local signup and Clerk-based flows.

---

## 4. Correctness Risks

### 4.1 Nil/Zero Identity

- **Scenario:** AttachIdentityContext skips identity when no Clerk claims; `CurrentIdentity` returns `(authz.Identity{}, false)`.
- **Evidence:** `clerk_auth.go` L49-53: if no clerkUserID, `next.ServeHTTP` without identity.
- **Verdict:** RequireMember/RequirePermission check `!ok || !identity.IsAuthenticated()` and return 401. **Correct.**

### 4.2 Scope Param Mismatch

- **Scenario:** Route uses `{group_id}` (snake_case) but middleware extracts `groupId` (camelCase).
- **Evidence:** `clerk_auth.go` L61-62 uses `chi.URLParam(r, "groupId")` and `chi.URLParam(r, "eventId")`.
- **Verdict:** Any route using `{group_id}` or `{event_id}` would get empty scope. **Future routes must use `groupId` and `eventId`.**

### 4.3 EnsureUserForClerk vs EnsureLocalUserForClerk

- Two implementations: identity repo (`EnsureUserForClerk`) and users repo (`EnsureLocalUserForClerk`).
- Identity repo ensures `user_permission_overrides`; users repo does not.
- Both run in different flows; AttachIdentityContext runs first, so overrides are ensured. **Redundant but correct.**

### 4.4 RolePermissions("member") Missing users.read

- `RolePermissions("member")` does not grant `users.read`.
- `GET /v1/users/{id}` requires `users.read`; members get 403.
- **Verdict:** Matches spec; only moderator+ can read users globally.

---

## 5. Performance Risks

### 5.1 Queries Per Request

- **AttachIdentityContext:** 1) `EnsureUserForClerk` (1 tx with upsert + profile + overrides). 2) `ResolveIdentityByClerkUserID` (1 query). 3) `ResolveScope` (0–2 queries for group/event role).
- **Total:** 2–4 DB round-trips per authenticated request.
- **Verdict:** Acceptable for v1; consider caching identity in future.

### 5.2 Duplicate EnsureUser

- **GetMe** calls `EnsureLocalUserForClerk` after `AttachIdentityContext` has already run `EnsureUserForClerk`.
- **Effect:** Extra upsert (no-op on conflict) and SELECT.
- **Verdict:** Redundant but low cost.

---

## 6. Test Coverage Assessment

### 6.1 Covered

| Test                                            | File                        | What it covers                                       |
| ----------------------------------------------- | --------------------------- | ---------------------------------------------------- |
| `TestRequireMemberRejectsMissingClaims`         | `clerk_auth_test.go` L12-28 | 401 when no identity                                 |
| `TestRequireMemberAllowsWhenClaimsPresent`      | `clerk_auth_test.go` L30-51 | 204 when identity present and active                 |
| `TestRequirePermissionRejectsWithoutPermission` | `clerk_auth_test.go` L53-73 | 403 when member lacks users.read                     |
| `TestSchemaMatchesMigrations`                   | `schema_drift_test.go`      | Schema vs migrations, `global_role`/`account_status` |

### 6.2 Added (Post-Audit)

| Scenario                                             | File                 | Test                                          |
| ---------------------------------------------------- | -------------------- | --------------------------------------------- |
| 401 when RequirePermission without identity          | `clerk_auth_test.go` | `TestRequirePermissionRejectsWithoutIdentity` |
| 403 when user suspended                              | `clerk_auth_test.go` | `TestRequireMemberRejectsSuspended`           |
| 403 when read_only on POST/PUT/PATCH/DELETE          | `clerk_auth_test.go` | `TestRequireMemberRejectsReadOnlyOnWrite`     |
| read_only allows GET                                 | `clerk_auth_test.go` | `TestRequireMemberAllowsReadOnlyOnGet`        |
| Override allow (member + override grants users.read) | `clerk_auth_test.go` | `TestRequirePermissionAllowsWithOverride`     |
| Scoped membership granting permission (group owner)  | `clerk_auth_test.go` | `TestRequirePermissionAllowsWithScopedRole`   |
| authz.RolePermissions                                | `authz_test.go`      | `TestRolePermissions`                         |
| authz.ApplyOverrides                                 | `authz_test.go`      | `TestApplyOverrides`                          |
| authz.Identity.Can (global, scoped, override deny)   | `authz_test.go`      | `TestIdentity_Can_*`                          |

### 6.3 Still Missing

| Scenario                                            | Status                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Override deny (admin + override revokes users.read) | Covered in `authz_test.go` `TestIdentity_Can_OverrideDeny`; not in middleware integration |
| EnsureUserForClerk concurrency safety               | ❌ Missing (integration test with DB)                                                     |

---

## 7. Actionable Fixes (Minimal Diffs, Prioritized)

### P0 – Critical

1. ~~**Fix `migrations_integration_test.go`**~~ **DONE**
   - **File:** `db/migrations_integration_test.go`
   - **Change:** Use `goose down-to 0` for full teardown instead of single `goose down`.

### P1 – High

2. ~~**Add tests for suspended, read_only, overrides, scoped permissions**~~ **DONE**
   - **File:** `internal/middleware/clerk_auth_test.go`
   - Added: `TestRequireMemberRejectsSuspended`, `TestRequireMemberRejectsReadOnlyOnWrite`, `TestRequireMemberAllowsReadOnlyOnGet`, `TestRequirePermissionRejectsWithoutIdentity`, `TestRequirePermissionAllowsWithOverride`, `TestRequirePermissionAllowsWithScopedRole`.

3. ~~**Add authz unit tests**~~ **DONE**
   - **File:** `internal/shared/authz/authz_test.go`
   - Added: `TestRolePermissions`, `TestApplyOverrides`, `TestIdentity_Can_*`.

### P2 – Medium

4. **Document RequirePermission usage**
   - **File:** `internal/middleware/clerk_auth.go` or AGENTS.md
   - **Change:** Comment that RequirePermission must be used with RequireMember for status checks.

5. **Optional: Harden RequirePermission**
   - **File:** `internal/middleware/clerk_auth.go`
   - **Change:** Add suspended/read_only checks inside RequirePermission so it is safe even without RequireMember.

### P3 – Low

6. **Unify EnsureUser logic**
   - Consider making GetMe use identity from context and a users-service “get by id” instead of EnsureLocalUserForClerk.

7. **Add integration test for EnsureUserForClerk concurrency**
   - Run concurrent EnsureUserForClerk for same clerk ID; assert no errors and single user row.

---

## 8. Acceptance Checklist

| #   | Item                                                                        | Pass/Fail                                             |
| --- | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | `users.global_role` and `account_status` exist with correct constraints     | ✅ Pass                                               |
| 2   | `user_permission_overrides`, `group_memberships`, `event_memberships` exist | ✅ Pass                                               |
| 3   | Unique index on `(auth_provider, auth_provider_user_id)`                    | ✅ Pass                                               |
| 4   | Membership tables have PK preventing duplicates                             | ✅ Pass                                               |
| 5   | Drift test validates migration chain                                        | ✅ Pass                                               |
| 6   | AttachClerkAuth → AttachIdentityContext → RequireMember order               | ✅ Pass                                               |
| 7   | RequireMember returns 401 for missing auth                                  | ✅ Pass                                               |
| 8   | RequireMember returns 403 for suspended                                     | ✅ Pass                                               |
| 9   | RequireMember blocks read_only on write methods                             | ✅ Pass                                               |
| 10  | RequirePermission returns 401 for missing auth                              | ✅ Pass (TestRequirePermissionRejectsWithoutIdentity) |
| 11  | RequirePermission returns 403 for insufficient permission                   | ✅ Pass                                               |
| 12  | RequirePermission does not bypass RequireMember status checks               | ✅ Pass (order)                                       |
| 13  | EnsureUserForClerk uses transaction                                         | ✅ Pass                                               |
| 14  | EnsureUserForClerk uses ON CONFLICT                                         | ✅ Pass                                               |
| 15  | Scope resolution for groupId/eventId                                        | ⚠️ UNPROVEN (no routes)                               |
| 16  | Precedence: role → overrides → scope in Identity.Can                        | ✅ Pass (code)                                        |
| 17  | Tests for suspended, read_only, overrides, scoped                           | ✅ Pass                                               |

---

## Appendix A: DB Layer Verification

### Constraints

- `users.global_role`: `CHECK (global_role IN ('member', 'moderator', 'admin', 'super_admin'))` ✅
- `users.account_status`: `CHECK (account_status IN ('active', 'read_only', 'suspended'))` ✅
- `group_memberships`: `PRIMARY KEY (group_id, user_id)` ✅
- `event_memberships`: `PRIMARY KEY (event_id, user_id)` ✅

### Uniqueness

- `idx_users_auth_provider_subject` on `(auth_provider, auth_provider_user_id) WHERE auth_provider_user_id IS NOT NULL` ✅

### EnsureUserForClerk Concurrency

- Uses `pgx.TxOptions{}` (default isolation).
- `ON CONFLICT (auth_provider, auth_provider_user_id) DO UPDATE` – one of two concurrent inserts will conflict and update; both commit.
- Profiles and overrides use `ON CONFLICT DO NOTHING`; safe under concurrency.
- **Verdict:** Safe; no race on user creation. Profiles/overrides may have transient “duplicate key” on first insert, but `ON CONFLICT DO NOTHING` handles it.

---

## Appendix B: Authorization Precedence

1. **Base permissions:** `RolePermissions(globalRole)`
2. **Overrides:** `ApplyOverrides(base, overrides)` – overrides overwrite base for same permission
3. **Effective permissions:** Stored in `Identity.Permissions`
4. **Can(permission, scope):**
   - If `Permissions[permission]` is true → allow
   - Else, for `groups.read`, `groups.manage`, `events.read`, `events.manage` → check scope (GroupRole/EventRole)
   - Else → deny

**Order:** Global role → Overrides → Scoped role (for group/event permissions only).
