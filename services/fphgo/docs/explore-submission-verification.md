# Dive Site Submission and Admin Approval Workflow Verification

This document provides evidence-based verification of the dive site submission and moderation workflow implementation. It maps requirements to code locations, test coverage, and manual smoke steps.

## Verification Checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Members can submit a dive site proposal that is not publicly visible until approved | Verified | Phase 1-7 below |
| 2 | Admins can list pending submissions and approve or reject them | Verified | Phase 1-7 below |
| 3 | Public Explore reads only return approved sites | Verified | Phase 1-7 below |
| 4 | Submitters can view their own submissions and their moderation status | Verified | Phase 1-7 below |
| 5 | Routes, permissions, contracts, and tests are correct and stable | Verified | Phase 1-7 below |

---

## Phase 1: DB Schema and Migrations

### 1.1 dive_sites Moderation Fields

**Source:** `services/fphgo/db/schema/000_schema.sql` (lines 195-205)

```sql
submitted_by_app_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
reviewed_by_app_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
reviewed_at TIMESTAMPTZ,
moderation_reason TEXT,
moderation_state TEXT NOT NULL DEFAULT 'approved',
...
CHECK (moderation_state IN ('approved', 'pending', 'hidden'))
```

**Migration:** `services/fphgo/db/migrations/0018_explore_site_submission_moderation.sql`

- Adds: `submitted_by_app_user_id`, `reviewed_by_app_user_id`, `reviewed_at`, `moderation_reason`, `updated_at`
- Note: `moderation_state` was introduced in `0001_init.sql` (line 89) with CHECK constraint

### 1.2 Indexes

**Source:** `services/fphgo/db/schema/000_schema.sql` (lines 407-408)

```sql
CREATE INDEX IF NOT EXISTS idx_dive_sites_moderation_created_id ON dive_sites (moderation_state, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_dive_sites_submitter_created_id ON dive_sites (submitted_by_app_user_id, created_at DESC, id DESC);
```

**Migration 0018** creates the same indexes (lines 14-17).

### 1.3 Migration Application

Goose migrations are applied via `make migrate-up` (working dir: `services/fphgo`). Migration 0018 is reversible via `make migrate-down`.

---

## Phase 2: sqlc Queries and Repo Boundaries

### 2.1 Query Inventory

**File:** `services/fphgo/internal/features/explore/repo/queries/explore.sql`

| Query Name | Purpose |
|------------|---------|
| `CreateSiteSubmission` | Insert new site with `moderation_state='pending'` |
| `ListMySiteSubmissions` | List submissions by `submitted_by_app_user_id` |
| `GetMySiteSubmissionByID` | Get submission detail for owner |
| `ListPendingSites` | List sites where `moderation_state='pending'` |
| `GetSiteByIDForModeration` | Get any submission by ID for moderator |
| `ApproveSite` | Set `moderation_state='approved'`, set reviewer metadata |
| `RejectOrHideSite` | Set `moderation_state='hidden'`, set reviewer metadata |

### 2.2 Public List Filters (Approved Only)

All public-facing queries enforce `moderation_state = 'approved'`:

- `ListSites` (line 54): `WHERE s.moderation_state = 'approved'`
- `GetSiteBySlug` (line 123): `AND s.moderation_state = 'approved'`
- `ListLatestUpdates` (line 213): `AND s.moderation_state = 'approved'`
- `ListSavedSitesForUser` (line 280): `AND s.moderation_state = 'approved'`

### 2.3 Repo Boundary

**File:** `services/fphgo/internal/features/explore/repo/repo.go`

- Repo executes sqlc methods only; no policy logic.
- Policy (rate limits, dedupe, slug generation) lives in `services/fphgo/internal/features/explore/service/service.go`.

---

## Phase 3: Routes and Permissions

### 3.1 Mount Point

**File:** `services/fphgo/internal/app/routes.go` (lines 112-113, 230)

- Explore router mounted at `/v1/explore`
- Routes defined in `services/fphgo/internal/features/explore/http/routes.go`

### 3.2 Route Enumeration

**File:** `services/fphgo/internal/features/explore/http/routes.go`

| Path | Method | Handler | Guard |
|------|---------|---------|-------|
| `/sites` | GET | ListSites | Public |
| `/sites/{slug}` | GET | GetSiteBySlug | Public |
| `/updates` | GET | ListLatestUpdates | Public |
| `/sites/{slug}/buddy-preview` | GET | GetBuddyPreviewBySlug | Public |
| `/sites/submit` | POST | CreateSiteSubmission | RequireMember + explore.submit |
| `/sites/submissions` | GET | ListMySiteSubmissions | RequireMember + explore.submit |
| `/sites/submissions/{id}` | GET | GetMySiteSubmissionByID | RequireMember + explore.submit |
| `/sites/{siteId}/updates` | POST | CreateUpdate | RequireMember + explore.submit |
| `/sites/{siteId}/save` | POST | SaveSite | RequireMember + explore.submit |
| `/sites/{siteId}/save` | DELETE | UnsaveSite | RequireMember + explore.submit |
| `/sites/{slug}/buddy-intents` | GET | GetBuddyIntentsBySlug | RequireMember + buddies.read |
| `/moderation/sites/pending` | GET | ListPendingSites | RequireMember + explore.moderate |
| `/moderation/sites/{id}` | GET | GetSiteByIDForModeration | RequireMember + explore.moderate |
| `/moderation/sites/{id}/approve` | POST | ApproveSite | RequireMember + explore.moderate |
| `/moderation/sites/{id}/reject` | POST | RejectSite | RequireMember + explore.moderate |

### 3.3 Permission Constants

**File:** `services/fphgo/internal/shared/authz/authz.go` (lines 15-17)

```go
PermissionExploreRead     Permission = "explore.read"
PermissionExploreSubmit   Permission = "explore.submit"
PermissionExploreModerate Permission = "explore.moderate"
```

**Role grants:** `packages/config/src/rbac/permissions.ts`

- `explore.submit`: member, trusted_member, moderator, explore_curator, records_verifier, admin, super_admin
- `explore.moderate`: explore_curator, moderator, admin, super_admin

### 3.4 No Public Exposure of Pending/Hidden

- Public routes (`/sites`, `/sites/{slug}`, `/updates`, `/sites/{slug}/buddy-preview`) use queries that filter `moderation_state = 'approved'`.
- Pending and hidden sites are only accessible via member routes (`/sites/submissions`, `/sites/submissions/{id}`) for owners, or moderator routes (`/moderation/sites/*`) for reviewers.

---

## Phase 4: Service Policy Behavior

### 4.1 Submission Rules

**File:** `services/fphgo/internal/features/explore/service/service.go`

- `CreateSiteSubmission` (lines 306-358):
  - Validates actor UUID; returns 401 if invalid
  - Rate limits: 1/hour and 5/day per actor (lines 318-322)
  - Dedupe: `FindApprovedSiteDuplicate` rejects when approved site exists with same name+area (lines 324-332)
  - Inserts via `CreateSiteSubmission` with `moderation_state='pending'` (sqlc query line 335)
  - Slug: `pendingSlug()` generates `pending-{uuid12}` (lines 481-484)

### 4.2 Approval Rules

**File:** `services/fphgo/internal/features/explore/service/service.go`

- `moderateSite` (lines 521-552):
  - Requires `moderation_state == 'pending'`; returns 409 `invalid_state` otherwise (lines 536-538)
  - On approve: `generateApprovedSlug` ensures slug uniqueness (lines 489-518)
  - `ApproveSite` repo call sets `reviewed_by_app_user_id`, `reviewed_at`, `moderation_reason` (explore.sql lines 478-486)

### 4.3 Rejection Rules

- `RejectOrHideSite` sets `moderation_state = 'hidden'` (explore.sql lines 491-495)
- Submitter can still view via `GetMySiteSubmissionByID` (filtered by `submitted_by_app_user_id`)

---

## Phase 5: API Contracts and Error Shapes

### 5.1 packages/types

**File:** `packages/types/src/index.ts`

| Type | Lines | Purpose |
|------|-------|---------|
| `ExploreSiteModerationState` | 1247 | `"approved" \| "pending" \| "hidden"` |
| `CreateExploreSiteSubmissionRequest` | 1249-1263 | Submission request body |
| `ModerateExploreSiteRequest` | 1265-1267 | Optional `reason` for approve/reject |
| `ExploreSiteSubmission` | 1269-1295 | Submission response shape |
| `ExploreSiteSubmissionResponse` | 1297-1299 | `{ submission: ExploreSiteSubmission }` |
| `ExploreSiteSubmissionListResponse` | 1301-1304 | `{ items: ExploreSiteSubmission[], nextCursor? }` |

### 5.2 Go DTOs

**File:** `services/fphgo/internal/features/explore/http/dto.go`

- `CreateSiteSubmissionRequest` (lines 86-100): json + validate tags
- `ModerateSiteRequest` (lines 102-104): optional `reason`
- `SiteSubmission` (lines 115-143): matches ExploreSiteSubmission

### 5.3 Error Envelope

- Validation: `httpx.WriteValidationError` with `issues[]` (path, code, message)
- Forbidden: `apperrors.New(http.StatusForbidden, ...)`
- NotFound: `apperrors.New(http.StatusNotFound, ...)`
- Rate limited: `apperrors.NewRateLimited` with `Retry-After` header

---

## Phase 6: Web UI Behavior

### 6.1 Member Flow

| Step | Location | Evidence |
|------|----------|----------|
| Submit site entry | `apps/web/src/features/explore/components/ExploreLayout.tsx` (lines 332-338) | Link to `/explore/submit` and `/explore/submissions` |
| Submit form | `apps/web/src/app/explore/submit/page.tsx` | Calls `exploreApi.submitSite()` (explore-v1.ts) |
| Pending status | Submit page (lines 102-113) | "Status: pending review" after success |
| My submissions | `apps/web/src/app/explore/submissions/page.tsx` | `exploreApi.listMySubmissions()` |
| Submission detail | `apps/web/src/app/explore/submissions/[id]/page.tsx` | `exploreApi.getMySubmissionById(id)` |

### 6.2 Admin Flow

| Step | Location | Evidence |
|------|----------|----------|
| Admin review screen | `apps/web/src/app/moderation/explore-sites/page.tsx` | `RequirePermission perm="explore.moderate"` |
| Pending list | Same file | `exploreApi.listPendingSites()` |
| Approve/Reject | `apps/web/src/app/moderation/explore-sites/[id]/page.tsx` | `exploreApi.approveSite()`, `exploreApi.rejectSite()` |

### 6.3 Public Flow

- Explore page uses `exploreApi.listSites()` which hits `GET /v1/explore/sites` (approved only).
- Signed-out browse: public routes require no auth; backend filters to approved.

### 6.4 API Client

**File:** `apps/web/src/features/diveSpots/api/explore-v1.ts`

- `submitSite`, `listMySubmissions`, `getMySubmissionById`, `listPendingSites`, `getModerationSiteById`, `approveSite`, `rejectSite`

**File:** `apps/web/src/lib/api/fphgo-routes.ts` (lines 34-48)

- All explore and moderation paths defined and match Go routes.

---

## Phase 7: Tests

### 7.1 HTTP Integration Tests

**File:** `services/fphgo/internal/features/explore/http/integration_test.go`

| Test | Coverage |
|------|----------|
| `TestExplorePublicReadsAndWriteAuthGates` | Public list/detail/updates/preview OK; signed-out save/intents return 401 |
| `TestExploreCreateUpdateValidationAndRateLimit` | Validation 400, rate limit 429 with Retry-After |
| `TestExploreSubmissionRoutesRequireAuthAndPermission` | Signed-out POST `/sites/submit` returns 401 |
| `TestExploreSubmissionAndModerationRoutes` | Member submit 201, my submissions 200; moderator pending 200, approve 200; member pending 403 |

### 7.2 Repo Integration Tests

**File:** `services/fphgo/internal/features/explore/repo/repo_integration_test.go`

| Test | Coverage |
|------|----------|
| `TestListLatestUpdatesExcludesHiddenRows` | Hidden dive_site_updates excluded from list |
| `TestSiteSubmissionWorkflowVisibility` | Create submission (pending); public list excludes it; my submissions includes it; pending list includes it; approve makes it public; reject sets hidden; owner can view rejected detail with reason |

**Note:** Repo integration tests require `TEST_DB_DSN`; they are skipped when unset.

### 7.3 Authz Tests

**File:** `services/fphgo/internal/shared/authz/authz_test.go`

- Moderator gets `explore.moderate`; member does not.

### 7.4 Run Command

```bash
cd services/fphgo && go test ./internal/features/explore/... -v -count=1
```

**Expected:** HTTP tests pass; repo tests pass when `TEST_DB_DSN` is set, otherwise skip.

---

## Phase 8: Docs and Release Checklist Alignment

### 8.1 explore-v1.md

**File:** `services/fphgo/docs/explore-v1.md`

- Sections for `POST /v1/explore/sites/submit`, `GET /v1/explore/sites/submissions`, `GET /v1/explore/sites/submissions/{id}`
- Moderation routes: `GET /moderation/sites/pending`, `GET /moderation/sites/{id}`, `POST /moderation/sites/{id}/approve`, `POST /moderation/sites/{id}/reject`
- Data model: moderation workflow fields and meanings (pending, approved, hidden)
- Safety rules: public read only approved; submitters see own; moderators via explore.moderate

### 8.2 api-compatibility-matrix.md

**File:** `services/fphgo/docs/api-compatibility-matrix.md`

- All explore submission and moderation endpoints listed with web caller and Go handler
- Status: OK for all explore endpoints

### 8.3 MVP Release Checklist

**File:** `docs/checklist/mvp1releaset.md`

- Section 1.4 (lines 107-109): "Members can submit a dive site into a pending moderation queue"; "Submitters can view their own submission list/detail and moderation status"; "Moderators can review pending dive sites and approve or reject them"
- explore_doc link: `services/fphgo/docs/explore-v1.md`

---

## Traceability Table

| Requirement | DB | sqlc | Service | Routes | Permissions | Types | Web | Tests |
|-------------|----|------|---------|--------|-------------|-------|-----|-------|
| Submit proposal, not public until approved | schema 000, mig 0018 | CreateSiteSubmission, ListSites filter | CreateSiteSubmission, pendingSlug | POST /sites/submit | explore.submit | CreateExploreSiteSubmissionRequest | submit page, ExploreLayout | TestExploreSubmissionAndModerationRoutes, TestSiteSubmissionWorkflowVisibility |
| Admins list pending, approve, reject | moderation fields | ListPendingSites, ApproveSite, RejectOrHideSite | ListPendingSites, ApproveSite, RejectSite | GET/POST moderation/sites/* | explore.moderate | ModerateExploreSiteRequest, ExploreSiteSubmission | moderation pages | TestExploreSubmissionAndModerationRoutes, TestSiteSubmissionWorkflowVisibility |
| Public Explore approved only | CHECK, indexes | ListSites, GetSiteBySlug, ListLatestUpdates, ListSavedSitesForUser | ListSites, GetSiteBySlug | GET /sites, /sites/{slug}, /updates | public | ExploreListResponse | ExploreLayout, DiveSpotCard | TestSiteSubmissionWorkflowVisibility |
| Submitter views own status | submitted_by_app_user_id | ListMySiteSubmissions, GetMySiteSubmissionByID | ListMySiteSubmissions, GetMySiteSubmissionByID | GET /sites/submissions, /sites/submissions/{id} | explore.submit | ExploreSiteSubmission | submissions page, detail page | TestSiteSubmissionWorkflowVisibility |

---

## Manual Smoke Steps for Staging

1. **Signed-out browse:** Open `/explore`; verify only approved sites appear. Open a site detail; verify no pending/hidden sites visible.
2. **Member submit:** Sign in as member; go to `/explore/submit`; submit a new site; verify "Status: pending review" and link to view submission.
3. **My submissions:** Go to `/explore/submissions`; verify submitted site appears with `pending` badge.
4. **Submission detail:** Open `/explore/submissions/{id}`; verify full detail and moderation state.
5. **Moderator pending:** Sign in as moderator (or explore_curator); go to `/moderation/explore-sites`; verify pending site appears.
6. **Approve:** Open submission; add optional reason; click Approve; verify redirect to list; verify site appears in public Explore.
7. **Reject:** Submit another site; as moderator, reject with reason; verify submitter can still view at `/explore/submissions/{id}` with `hidden` and moderator note.
8. **Permission gate:** Sign in as member without explore.moderate; try `/moderation/explore-sites`; verify 403 or redirect.

---

## Acceptance Summary

- End-to-end flow works as designed: submit, pending, approve/reject, public visibility.
- Public Explore remains clean and approved-only via sqlc filters.
- Moderation workflow is permissioned (explore.moderate), auditable (reviewed_by, reviewed_at, moderation_reason), and test-covered.
- Docs (explore-v1.md, api-compatibility-matrix.md) and release checklist (mvp1releaset.md) reflect the capability with no broken links.
