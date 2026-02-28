---
doc_id: FPH-MVP1-RELEASE-CHECKLIST
title: Freediving Philippines MVP v1 Release Checklist
version: 1.2
status: Draft
timezone: Asia/Manila
created_at: 2026-02-28
last_updated_at: 2026-02-28
scope:
  - services/fphgo (Go API)
  - apps/web (Next.js web app)
release_scope: "Everything up to P1 Social Core (no P2 Diving Core)"
owners:
  - role: Release Captain
    name: "TBD"
  - role: Backend Owner
    name: "TBD"
  - role: Frontend Owner
    name: "TBD"
  - role: Data Owner
    name: "TBD"
  - role: Moderation Owner
    name: "TBD"
links:
  api_compatibility_matrix: "services/fphgo/docs/api-compatibility-matrix.md"
  authz_permissions_doc: "services/fphgo/docs/authz-permissions-v1.md"
  rate_limits_doc: "services/fphgo/docs/rate-limits-v1.md"
  moderation_actions_doc: "services/fphgo/docs/moderation-actions-v1.md"
  moderation_visibility_doc: "services/fphgo/docs/moderation-visibility-v1.md"
  explore_doc: "services/fphgo/docs/explore-v1.md"
  profiles_doc: "services/fphgo/docs/profiles-v1.md"
  blocks_doc: "services/fphgo/docs/blocks-v1.md"
  reports_doc: "services/fphgo/docs/reports-v1.md"
  buddies_doc: "services/fphgo/docs/buddies-v1.md"
  buddies_visibility_doc: "services/fphgo/docs/buddies-visibility-v1.md"
  buddy_finder_doc: "services/fphgo/docs/buddy-finder-v1.md"
  messaging_doc: "services/fphgo/docs/messaging-v1.md"
  messaging_state_doc: "services/fphgo/docs/messaging-state-v1.md"
  chika_doc: "services/fphgo/docs/chika-v1.md"
  chika_pseudonymity_doc: "services/fphgo/docs/chika-pseudonymity-v1.md"
  media_doc: "docs/media/media-v1.md"
  contract_tests_doc: "services/fphgo/docs/contract-tests-v1.md"
  contract_snapshot_gate_doc: "services/fphgo/docs/contract-snapshot-gate.md"
  production_grade_doc: "services/fphgo/docs/production-grade.md"
  ci_config: ".github/workflows/ci.yml"
notes:
  - "This checklist is a gate. If an item is unchecked, either complete it or explicitly mark it Deferred with rationale and risk."
  - "Single-instance websocket hub is acceptable for MVP, but must be documented and deployment must reflect it."
  - "No Redis in v1. Rate limits must be DB-backed or documented as single-instance in-memory."
  - "Media v1 is in scope. Avatars, chika attachments, and profile feed images depend on it."
  - "CDN worker is an external dependency not in this repo. Its spec is in docs/media/media-v1.md."
  - "Canonical media spec: docs/media/media-v1.md. services/fphgo/docs/media-v1.md is a pointer."
---

# MVP v1 Release Checklist

## 0) How to use this checklist

- Check each item.
- Add evidence for each major gate (PR link, test output, screenshot, log line, doc section, or command result).
- If you defer an item, add:
  - Reason
  - Risk
  - Mitigation
  - Owner
  - Follow-up ticket

### Release metadata to fill in before go-live

- Target release date: `TBD`
- Release environment: `staging` then `production`
- Release tag: `TBD`
- Backend commit SHA: `TBD`
- Web commit SHA: `TBD`
- DB migration version: `TBD`
- Release Captain: `TBD`
- Rollback decision maker: `TBD`

---

## 1) Scope lock and route alignment

### 1.1 Scope boundaries (no P2 Diving Core)

- [ ] Out of scope modules are identified and excluded from MVP v1 release. Candidates: Events, Competitive Records, Groups, Training Logs, Marketplace, Collaborations.
- [x] Explore (`/v1/explore`) ships in MVP v1. It is mounted in the router with `explore.read` (all roles), `explore.submit` (member+), and `explore.moderate` (moderator+).
- [x] Buddy Finder public preview ships in MVP v1 under `/v1/buddy-finder/preview`, and member intent routes are gated behind auth and existing buddy permissions.
- [ ] A written list of in-scope migrated modules exists and is agreed by owners.
- [ ] For migrated modules, `apps/web` calls only `services/fphgo`.
- [ ] No `apps/api/*` runtime dependency exists for migrated modules.

**Evidence:**

- Migrated module list:
- PR / commit:
- Notes:

### 1.4 Explore and Buddy Finder hook quality

- [ ] Best add-on verification is complete and reviewed: `docs/specs/best-addon-mvp1-verification.md`
- [ ] Explore shows seeded real sites with verification, last updated, and at least one conditions summary per surfaced card set.
- [ ] Conditions Pulse ships with a public `Latest updates near you` page and site detail add-update flow.
- [ ] Signed-out users can browse Explore and open shareable site detail pages.
- [ ] Signed-out users can see Buddy Finder preview value quickly without seeing exact location or direct contact.
- [ ] Dive site pages show buddy intents with site-linked intents first and area fallback second.
- [ ] Signed-out dive site pages show only redacted buddy preview cards; full notes and message entry require sign-in.
- [ ] Save-site and message-buddy actions trigger sign-in naturally.
- [ ] Members can submit a dive site into a pending moderation queue.
- [ ] Submitters can view their own submission list/detail and moderation status.
- [ ] Moderators can review pending dive sites and approve or reject them.
- [ ] Trust ladder appears on buddy cards, profile header, and messaging request preview without leaking precise last-seen or location data.
- [ ] Saved hub ships with saved sites and saved buddies tabs, and blocked users are excluded from saved people results.
- [ ] Buddy share pages use redacted public preview only and do not leak contact or exact location.
- [ ] Message composer supports meet-at plan cards with site metadata and thread rendering.
- [ ] Onboarding only asks for home area, interests, and optional cert level.

**Evidence:**

- Explore screenshots / route checks:
- Buddy Finder screenshots / route checks:
- Onboarding flow notes:

### 1.2 API compatibility matrix is accurate and green

- [ ] `services/fphgo/docs/api-compatibility-matrix.md` includes every endpoint that `apps/web` calls for migrated features.
- [ ] All rows for migrated features are marked OK.
- [ ] Any temporary compatibility shims are documented, including end date.
- [ ] Media v1 endpoints are included in the matrix: `POST /v1/media/upload`, `POST /v1/media/upload-multiple`, `GET /v1/media/mine`, `POST /v1/media/urls`.

**Evidence:**

- Matrix link and section anchors:
- PR / commit:

### 1.3 Route invariants

- [ ] All public API routes for migrated features are under `/v1/...`.
- [ ] No web API call targets legacy paths (`/messages`, `/threads`, etc) for migrated features.
- [ ] Route surface invariant tests exist (or route enumeration checks in CI).
- [ ] Contract snapshot gate enforces route stability: `services/fphgo/docs/contract-snapshot-gate.md`.

**Evidence:**

- Test name and output:
- PR / commit:

---

## 2) Authentication and authorization gates

### 2.1 Clerk configuration correctness

- [ ] Production Clerk settings are correct (issuer, audience, keys as required).
- [ ] `CLERK_SECRET_KEY` is required in production configuration.
- [ ] Any DEV_AUTH or local bypass is blocked in production builds and documented.
- [ ] Token extraction uses `Authorization: Bearer <token>` consistently.
- [ ] Backend uses the current Clerk Go SDK integration patterns (`clerkhttp.WithHeaderAuthorization` + `clerk.SessionClaimsFromContext`); no deprecated `session.Verify`.

**Evidence:**

- Config docs / env var list:
- Staging verification notes:
- PR / commit:

### 2.2 Auth middleware and identity resolution

- [ ] Every protected route group uses auth middleware.
- [ ] Request context includes resolved internal app user identity for member routes.
- [ ] Identity resolution and permission resolution use DB-backed source of truth.
- [ ] Auth failures return consistent `ApiError` shape.
- [ ] `/ws` requires authenticated claims before websocket accept.

**Evidence:**

- Middleware file references:
- Integration test names:

### 2.3 Permissions model is safe (no broad default write)

- [ ] Feature-scoped permissions exist at least for:
  - Profiles: `profiles.read`, `profiles.write`
  - Blocks: `blocks.read`, `blocks.write`
  - Reports: `reports.write`, `reports.read`, `reports.moderate`
  - Buddies: `buddies.read`, `buddies.write`
  - Messaging: `messaging.read`, `messaging.write`
  - Chika: `chika.read`, `chika.write`, `chika.moderate`
  - Moderation: `moderation.read`, `moderation.write`
  - Media: `media.read`, `media.write`
- [ ] New member defaults do not grant broad write that covers unrelated features.
- [ ] Backfill migration exists for existing users where required.
- [ ] `RequirePermission` is used consistently on all relevant endpoints.
- [ ] Web does not deny access while session is still loading.

**Evidence:**

- Permissions doc: `services/fphgo/docs/authz-permissions-v1.md`
- PR / commit:
- Tests:

### 2.4 Account state enforcement

- [ ] `suspended` state blocks all writes across migrated features.
- [ ] `read_only` state blocks all writes across migrated features.
- [ ] The error returned is stable and appropriate (for example 403 with clear `ApiError.code`).
- [ ] State enforcement is in service layer where business rules exist, and also guarded by middleware where appropriate.

**Evidence:**

- Endpoint list tested:
- Tests and output:

---

## 3) Shared contracts and error handling

### 3.1 `packages/types` is the single source of truth

- [ ] The barrel at `packages/types/src/index.ts` re-exports all MVP feature contracts. Sub-modules: `./api/authz`, `./api/error`, `./api/me`, `./api/profile`, `./media`, `./reports`. Buddies, messaging, and chika types are inline in `index.ts` (migration to sub-modules optional for MVP).
- [ ] No duplicate local type definitions exist in `apps/web/src` for types exported by `@freediving.ph/types`. Spot-check: `MeResponse`, `ApiError`, `ConversationListItem`, `ChikaThreadResponse` must be imported from `@freediving.ph/types`, not redefined.
- [ ] Contracts match actual JSON responses from `services/fphgo`.

**Evidence:**

- Barrel file: `packages/types/src/index.ts`
- PR / commit:
- Contract tests: `services/fphgo/docs/contract-tests-v1.md`

### 3.2 ApiError shape is consistent

The canonical error envelope produced by `internal/shared/httpx/respond.go`:

```json
{ "error": { "code": "...", "message": "...", "requestId": "...", "details": { ... } } }
```

Validation errors use a separate struct that adds `issues`:

```json
{ "error": { "code": "validation_error", "message": "Invalid request", "issues": [ { "path": ["field"], "code": "required", "message": "This field is required" } ] } }
```

- [ ] All non-validation errors use `httpx.Error` which produces the shape above, including `requestId`.
- [ ] Validation errors use `httpx.WriteValidationError` with `issues[]` where each issue has three required fields:
  - `path`: always a JSON array (Go type `[]any`), not a scalar string.
  - `code`: always a non-empty string.
  - `message`: always a non-empty string.
- [x] **Contract gap fixed**: `packages/types/src/api/error.ts` updated to match Go: `ApiErrorIssue.code` is now required (`code: string`), `path` is now `(string | number)[]` (always array), and `ApiError` includes `requestId?: string`. Consumer `apps/web/src/lib/http/api-error.ts` and `apps/web/src/app/moderation/reports/[reportId]/page.tsx` updated to match.
- [ ] Error code normalization is stable (from `normalizeErrorCode`):
  - 401 always returns `code: "unauthenticated"`
  - 403 returns `code: "forbidden"` (or `code: "blocked"` when the original code is `"blocked"`)
  - 404 always returns `code: "not_found"`
  - 429 returns `code: "rate_limited"` with `Retry-After` header when `details.retry_after_seconds` is set.
- [ ] Forbidden and unauthorized errors do not leak internal details.

**Evidence:**

- Source: `services/fphgo/internal/shared/httpx/respond.go`
- TS types: `packages/types/src/api/error.ts`
- PR / commit (contract gap fix):

### 3.3 BIGINT safety for web clients

- [ ] Any BIGSERIAL ids exposed to web are serialized as strings in JSON, or there is a documented alternative that is proven safe.
- [ ] `apps/web` treats such ids as strings in types and logic.

**Evidence:**

- Example payloads:
- Type definitions:

### 3.4 Validation contract consistency

- [ ] All POST/PUT/PATCH handlers use `httpx.DecodeAndValidate` (no raw `json.NewDecoder` in handlers). Media upload handlers use `r.ParseMultipartForm` which is the correct exception for file uploads.
- [ ] All request DTO structs have both `json` and `validate` tags.
- [ ] Validation error issue codes match the canonical set from `internal/shared/validatex/issues.go`:
  - Validator tags: `required`, `invalid_email`, `invalid_uuid`, `too_small`, `too_big`, `invalid_enum`, `invalid_url`, `invalid_datetime`, `custom`
  - JSON decode errors: `unrecognized_key`, `invalid_type`
  - Fallback codes: `invalid_json`, `validation_failed`
- [ ] Web error handling maps `validation_error` code to user-facing field errors consistently.

**Evidence:**

- Source: `services/fphgo/internal/shared/validatex/issues.go`, `services/fphgo/internal/shared/httpx/validate.go`
- Handler audit results:
- Tests:

---

## 4) Safety primitives and moderation loop

### 4.1 Blocks v1 is complete and enforced

- [ ] Blocks endpoints exist: block, unblock, list.
- [ ] Blocks enforced for messaging writes (request create, message send).
- [ ] Messaging inbox hides blocked relationships.
- [ ] Blocks enforced for chika reads (threads and comments list) both directions.
- [ ] Blocks enforced for buddies writes (cannot request, accept, or buddy across a block).
- [ ] Block enforcement returns stable ApiError codes.

**Evidence:**

- Tests:
- Docs: `services/fphgo/docs/blocks-v1.md`

### 4.2 Reports v1 is operational

- [ ] Can report targets: user, message, chika_thread, chika_comment.
- [ ] Mixed id targets are handled safely:
  - UUID targets parsed and stored as uuid column
  - BIGINT targets parsed and stored as bigint column
  - DB constraints prevent invalid combinations
- [ ] Target existence checks are enforced.
- [ ] Target author resolution works for moderator view.
- [ ] Cooldown or cap prevents report spam and is documented.
- [ ] Audit trail events are written for create and status changes.
- [ ] Moderator triage endpoints exist: list, detail, status update.

**Evidence:**

- Tests:
- Docs: `services/fphgo/docs/reports-v1.md`

### 4.3 Moderation actions exist and are auditable

- [ ] Moderator can suspend and unsuspend a user.
- [ ] Moderator can set and clear read_only for a user.
- [ ] Moderator can hide and unhide chika thread and comment.
- [ ] Every moderation action writes an immutable audit record:
  - actor_app_user_id
  - action
  - target_type and target_id
  - reason
  - timestamp
  - optional linked report id
- [ ] Hidden content is not visible to normal members, but moderators can view it with markers.
- [ ] Enforcement integrates with account state gates (suspended, read_only).
- [ ] Moderation visibility rules match: `services/fphgo/docs/moderation-visibility-v1.md`.

**Evidence:**

- Tests:
- Docs: `services/fphgo/docs/moderation-actions-v1.md`

---

## 5) Profiles v1 readiness

- [ ] View a profile works and returns contract-stable fields.
- [ ] Edit my profile works with validation and consistent error shape.
- [ ] User search for typeahead works with pagination and permission enforcement.
- [ ] Privacy defaults are enforced (coarse location by default).
- [ ] Buddy count and buddy preview behavior for profile pages is defined:
  - Who can see it (public, members-only, buddies-only, self-only)
  - Blocks influence visibility
- [ ] Profile endpoints are covered by integration tests (401, 403, 200, 400 validation).

**Evidence:**

- Docs: `services/fphgo/docs/profiles-v1.md`
- Tests:

---

## 6) Buddies v1 readiness

### 6.1 Buddy lifecycle

- [ ] Create buddy request (not self, not blocked).
- [ ] Incoming and outgoing requests list.
- [ ] Accept and decline request.
- [ ] Cancel outgoing pending request.
- [ ] Remove buddy.
- [ ] Reverse request dedupe is deterministic (A to B then B to A converges).
- [ ] Idempotency behavior is defined and tested for request creation and cancel.

**Evidence:**

- Docs: `services/fphgo/docs/buddies-v1.md`
- Tests:

### 6.2 Buddy visibility policy

- [ ] Buddy list and count visibility rules are documented and enforced.
- [ ] Blocks filter buddy list and count.
- [ ] Suspended users are excluded from listings for normal members (unless moderator view is intended and documented).
- [ ] List endpoint uses stable ordering and cursor pagination.
- [ ] Visibility rules match: `services/fphgo/docs/buddies-visibility-v1.md`.

**Evidence:**

- Visibility doc section or link:
- Tests:

---

## 7) Messaging v1 readiness

### 7.1 Request model and preview flow

- [ ] Non-buddy DM creates a request state.
- [ ] Recipient sees request preview that includes the first message content before accepting.
- [ ] Sender can send additional messages while pending, as specified.
- [ ] Buddies bypass request and conversations are active immediately.
- [ ] Decline behavior is defined (what the sender sees, can they re-request, cooldown).
- [ ] Cooldowns exist for request initiation to prevent spam.
- [ ] State transitions match: `services/fphgo/docs/messaging-state-v1.md`.

**Evidence:**

- Docs: `services/fphgo/docs/messaging-v1.md`
- Tests:

### 7.2 Inbox truth and read states

- [ ] Inbox list returns explicit state: pending, accepted, declined where relevant.
- [ ] Inbox ordering is stable (last message time desc with tie-breaker).
- [ ] Unread counts are correct and do not drift under rapid messages.
- [ ] Mark read endpoint is idempotent.
- [ ] Blocked relationships are excluded from inbox list.
- [ ] read_only and suspended users cannot send or create requests.

**Evidence:**

- Tests:
- Example payloads:

### 7.3 WebSockets and client updates

- [ ] WebSocket envelope is versioned and stable (`v: 1`, `type`, `ts`, `payload` fields).
- [ ] Envelope types include at minimum: `message.created`, `conversation.updated`, `request.created`, `request.accepted`, `request.declined`.
- [ ] Send buffer is bounded and disconnect behavior is safe (overflow disconnects client).
- [ ] Heartbeat and deadlines are configured (server ping ticker, read/write deadlines, pong handler).
- [ ] Web uses websocket events to update cache with setQueryData, not refetch storms.
- [ ] Duplicate events do not corrupt state, or dedupe logic is present and tested.

**Evidence:**

- Websocket docs section:
- Tests or dev verification notes:

---

## 8) Chika v1 readiness

### 8.1 Categories and pseudonymity

- [ ] Categories exist and include a pseudonymous flag.
- [ ] Pseudonymity is per thread and stable for a given author within a thread.
- [ ] Member responses do not leak real identity in pseudonymous categories.
- [ ] Moderator responses include real identity only when `chika.moderate` (or equivalent) permission is present.
- [ ] Blocks filter thread and comment lists both directions.
- [ ] Hidden thread/comment visibility follows moderation rules (members cannot see, moderators can see with marker).
- [ ] Pseudonymity rules match: `services/fphgo/docs/chika-pseudonymity-v1.md`.

**Evidence:**

- Docs: `services/fphgo/docs/chika-v1.md`
- Tests:

### 8.2 Threads and comments flows

- [ ] Create thread with validation.
- [ ] List threads with cursor pagination and stable ordering.
- [ ] Thread detail is correct and stable.
- [ ] Create comment with validation.
- [ ] List comments with cursor pagination and stable ordering.
- [ ] Rate limits exist for thread and comment creation.
- [ ] Reports integration exists for thread and comment items in UI.

**Evidence:**

- Tests:
- Example payloads:

---

## 9) Media v1 readiness

### 9.1 Upload and storage

Actual routes from `services/fphgo/internal/features/media/http/routes.go` (mounted at `/v1/media`):

- `POST /v1/media/upload` (single file, requires `media.write`)
- `POST /v1/media/upload-multiple` (batch, max 20 files, requires `media.write`)
- `GET /v1/media/mine` (list own media with cursor pagination, requires `media.read`)
- `POST /v1/media/urls` (batch mint signed URLs, requires `media.read`)

Checklist:

- [ ] `POST /v1/media/upload` works and returns `MediaUploadResponse` shape.
- [ ] `POST /v1/media/upload-multiple` works and returns items + per-file errors.
- [ ] Validates context limits per `docs/media/media-v1.md` (max upload size, allowed MIME types).
- [ ] File type sniffed from magic bytes, not just client-provided MIME.
- [ ] EXIF GPS data is stripped on upload (or retention is explicitly documented and accepted as a known limitation).
- [ ] Object key pattern follows context convention (for example `avatars/{userId}/...`, `chika/{threadId}/...`).
- [ ] Metadata stored in DB: object_key, width, height, mime_type, size, state.
- [ ] State defaults to `active` on successful upload.

**Evidence:**

- Tests:
- Source: `services/fphgo/internal/features/media/http/handlers.go`
- Spec: `docs/media/media-v1.md`

### 9.2 Signed URL minting

- [ ] `POST /v1/media/urls` (batch) works and returns `MintMediaUrlsResponse` shape (items + errors).
- [ ] Returns signed CDN URLs with HMAC-SHA256 signature, base64url-encoded without padding.
- [ ] Context defaults applied correctly (TTL, max width, allowed presets per context).
- [ ] Refuses to mint for `hidden` or `deleted` media for normal members.
- [ ] Signing key version (`k`) is included; rotation procedure is documented in `docs/media/media-v1.md`.

**Evidence:**

- Tests:
- Example minted URL:

### 9.3 CDN worker (external dependency)

The Cloudflare Worker that validates signatures and serves resized images is not in this repo (no `wrangler.toml`). The spec is defined in `docs/media/media-v1.md` sections "Worker behavior" and "Signing spec".

- [ ] Worker code exists in a separate repo or deployment pipeline and is identified.
- [ ] Worker validates `exp` and `sig` per the signing spec.
- [ ] Worker enforces max width per context from object key prefix.
- [ ] Cache key ignores `sig` and `exp` to avoid fragmentation.
- [ ] Worker is deployed to a staging-equivalent domain before release.

**Evidence:**

- Worker repo or deploy pipeline:
- Manual validation test results:

### 9.4 Media list endpoint

- [ ] `GET /v1/media/mine` returns paginated list with `nextCursor`.
- [ ] Supports filtering by `contextType` and `contextId` query params.
- [ ] Limit defaults and max clamp are enforced.

**Evidence:**

- Tests:

### 9.5 Web integration

- [ ] `apps/web` uses a shared hook or helper that calls `/v1/media/urls` for batch minting.
- [ ] Avatar uses `thumb` preset, feed uses `card`, modal uses `dialog`.
- [ ] Minted URLs cached in React Query with stale times aligned to TTL.
- [ ] No permanent image URLs constructed on the client.

**Evidence:**

- Hook/helper file:
- Verification notes:

---

## 10) Operational guardrails

### 10.1 Rate limits and cooldowns are present and documented

- [ ] Rate limits and cooldown rules are documented: `services/fphgo/docs/rate-limits-v1.md`.
- [ ] High-risk endpoints have throttling:
  - reports.create
  - messages.send and request create
  - chika create thread and comment
  - buddy request create
  - media upload
- [ ] 429 responses include stable code (`rate_limited`) and retry semantics.
- [ ] Rate limit implementation documented as DB-backed or single-instance in-memory (see Known MVP limitations).

**Evidence:**

- Docs:
- Tests:

### 10.2 Pagination is consistent

- [ ] A shared cursor pattern is used across list endpoints.
- [ ] Limit defaults and max clamp exist and are consistent.
- [ ] Sorting rules are stable and documented per endpoint.
- [ ] `PaginationMeta` / cursor-based response shape matches `packages/types` contracts.

**Evidence:**

- Tests:
- Docs:

---

## 11) Data and database readiness

- [ ] Fresh DB bootstrap works from zero:
  - apply all Goose migrations (`make migrate-up`)
  - run sqlc generation (`make sqlc`) with no drift
  - start API and pass smoke tests
- [ ] Migrations are reversible where required, or rollback strategy is documented.
- [ ] Indexes exist for hot queries:
  - messaging inbox sorting and lookups
  - chika thread list sorting and filtering
  - reports list by status and created_at
  - blocks both-direction checks
  - buddy list and request lookups
  - media object_key lookups
- [ ] Backup plan exists for production Postgres, including restore procedure.
- [ ] Secrets and DSN handling are correct across environments.

**Evidence:**

- Commands and output:
- Backup notes:

---

## 12) CI and quality gates

### 12.1 Job: `quality` (TypeScript workspace)

CI job name: "Typecheck, Lint, Test, Build"

- [ ] `pnpm install --frozen-lockfile` succeeds.
- [ ] Migration check passes: `pnpm --filter @freediving.ph/api db:check-migrations` (checks Drizzle migrations in apps/api).
- [ ] Hot query explain passes when `CI_DATABASE_URL` secret is set: `pnpm --filter @freediving.ph/api db:explain-hot-queries -- --strict`.
- [ ] Typecheck passes across all workspaces: `pnpm typecheck`.
- [ ] Lint passes with zero warnings: `pnpm lint -- --max-warnings=0`.
- [ ] Tests pass: `pnpm test`.
- [ ] Build succeeds: `pnpm build`.

**Evidence:**

- CI run link:
- Logs summary:

### 12.2 Job: `fphgo-contract` (Go API)

CI job name: "fphgo Contract and Auth Gates"

- [ ] CI starts Postgres 16 service container with `DB_DSN` and `TEST_DB_DSN` env vars.
- [ ] Go version resolved from `services/fphgo/go.mod`.
- [ ] `sqlc` installed via `go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`.
- [ ] Goose migrations run successfully: `make migrate-up` (working dir: `services/fphgo`).
- [ ] sqlc generation runs cleanly: `make sqlc` (working dir: `services/fphgo`).
- [ ] `gofmt -l .` produces no output (all files formatted).
- [ ] `go vet ./...` passes.
- [ ] `go test ./...` passes, including:
  - route contract tests (`routes_contract_test.go`)
  - route snapshot tests (`routes_snapshot_test.go`)
  - integration tests against real Postgres

**Evidence:**

- CI run link:
- Test summary:

### 12.3 Job: `web-fphgo-smoke` (end-to-end smoke)

CI job name: "Web to fphgo Smoke". Starts fphgo via `go run ./cmd/api` with `DEV_AUTH=true` and `APP_ENV=ci`.

- [ ] CI starts Postgres 16 + runs `make migrate-up` + starts `services/fphgo` on port 4000.
- [ ] Health check passes at `http://localhost:4000/healthz`.
- [ ] Smoke test runs: `node --test test/fphgo-ci-smoke.test.mjs` (working dir: `apps/web`).
- [ ] Smoke test covers all migrated features:
  - `GET /healthz` (liveness)
  - `GET /readyz` (DB readiness)
  - Auth gate (401 for unauthenticated `/v1/me`, `/v1/blocks`, `/v1/buddies`)
  - `GET /v1/me` (session with dev auth)
  - `GET /v1/blocks` (blocks list)
  - `GET /v1/buddies` (buddies list)
  - `GET /v1/chika/categories` and `GET /v1/chika/threads` (chika)
  - `GET /v1/messages/inbox` (messaging)
  - `GET /v1/me/profile` (profiles)
  - `POST /v1/reports` (reports: validation error on empty body, verifies endpoint + auth + error shape)
  - `GET /v1/media/mine` (media: list own media)
  - `POST /v1/media/urls` (media: validation error on empty body, verifies endpoint + auth)
- [ ] `DEV_AUTH` is used only in CI (`APP_ENV=ci`); production builds must not include dev auth bypass.

**Evidence:**

- CI run link:
- Smoke test source: `apps/web/test/fphgo-ci-smoke.test.mjs`
- Smoke test output:

### 12.4 Contract test coverage

- [ ] Contract tests in `services/fphgo/internal/app/routes_contract_test.go` cover at least:
  - `/v1/me`
  - One endpoint each for: profiles, blocks, reports, buddies, messaging, chika, media
- [ ] Route surface snapshot test exists: `services/fphgo/internal/app/routes_snapshot_test.go` with snapshot at `testdata/route_surface.snapshot.json`.
- [ ] Contract test doc: `services/fphgo/docs/contract-tests-v1.md`.
- [ ] No production build includes dev-only auth bypass.

**Evidence:**

- Contract tests source: `services/fphgo/internal/app/routes_contract_test.go`
- Snapshot: `services/fphgo/internal/app/testdata/route_surface.snapshot.json`
- Test names:

---

## 13) Observability and runbooks

### 13.1 Logging and health

- [ ] Request logging exists with method, path, status, duration, request id.
- [ ] Errors logged include ApiError code where applicable.
- [ ] Health endpoints exist: liveness (`GET /healthz`) and readiness (`GET /readyz`). Readiness checks DB connectivity via `deps.ReadyCheck`.
- [ ] Websocket connection counts are visible somewhere (log or metrics).

**Evidence:**

- Log example:
- Health endpoint outputs:

### 13.2 Minimal metrics and alerts (MVP level)

- [ ] Track request rate, latency, error rate.
- [ ] Track 4xx and 5xx counts separately.
- [ ] Track rate limit triggers count.
- [ ] Track websocket connected clients count.
- [ ] Alerting exists at least for:
  - elevated 5xx
  - DB connectivity failures
  - sustained latency increase

**Evidence:**

- Dashboard links or screenshots:
- Alert rules notes:

### 13.3 Runbooks are written

- [ ] How to suspend and unsuspend a user.
- [ ] How to set and clear read_only.
- [ ] How to hide and unhide chika content.
- [ ] How to investigate a report and record action taken.
- [ ] How to rollback API deploy.
- [ ] How to rollback migrations, or how to restore DB from backup.
- [ ] How to rotate Clerk keys and secrets safely.
- [ ] How to rotate media signing keys (key version bump).

**Evidence:**

- Runbook locations:

---

## 14) Release execution plan

### 14.1 Staging validation

- [ ] Deploy `services/fphgo` to staging with production-like config.
- [ ] Confirm CDN worker is deployed to staging (external dependency; see section 9.3).
- [ ] Run a manual smoke suite on staging:
  - sign in
  - profile view and edit
  - upload avatar (media v1)
  - buddy request flow
  - DM request preview and accept
  - send and receive messages
  - chika create and browse (with attachment if applicable)
  - block and verify enforcement
  - report user and content
  - moderator action taken, verify effect
- [ ] Verify rate limits trigger predictably.
- [ ] Verify logs and metrics populate.

**Evidence:**

- Staging URL:
- Smoke results:

### 14.2 Production cutover checklist

- [ ] Confirm all required env vars are set in production.
- [ ] Confirm media signing secret and R2 credentials are set.
- [ ] Apply DB migrations with safe procedure.
- [ ] Confirm CDN worker is deployed to production (external dependency).
- [ ] Deploy backend first.
- [ ] Deploy web next.
- [ ] Run production smoke suite after deploy.
- [ ] Announce release and monitor metrics.

**Evidence:**

- Production smoke results:

### 14.3 Rollback plan

- [ ] Rollback steps are written and understood.
- [ ] Rollback decision criteria are defined (error rate, auth failures, DB issues).
- [ ] DB rollback strategy exists (down migrations or restore).
- [ ] Web rollback strategy exists (previous deploy artifact).
- [ ] CDN worker rollback strategy exists (previous worker version, external deployment).

**Evidence:**

- Rollback doc link:

---

## 15) Known MVP limitations

These are accepted tradeoffs for MVP v1. Each must have an owner and a follow-up plan.

| # | Limitation | Source | Impact | Accepted risk | Follow-up plan | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Single-instance in-memory websocket hub. No Redis pub/sub. | `services/fphgo/AGENTS.md` | Messages only delivered to clients connected to the same process. Horizontal scaling requires Redis or equivalent. | Acceptable at MVP traffic. | Add Redis pub/sub for multi-instance hub post-MVP. | TBD |
| 2 | No Redis for rate limiting. Rate limits are DB-backed or single-instance in-memory. | `services/fphgo/AGENTS.md` | In-memory counters reset on restart; DB-backed has higher latency. | Acceptable at MVP traffic. | Evaluate Redis-backed rate limiter when scaling. | TBD |
| 3 | Media signed URLs are public-by-link until expiry. | `docs/media/media-v1.md` | Anyone with a valid URL can view until it expires. No per-viewer authorization after mint. | Acceptable for MVP. TTL controls exposure window. | Add denylist or per-viewer checks post-MVP. | TBD |
| 4 | No video processing in Media v1. | `docs/media/media-v1.md` (Non-goals) | Only images supported. | MVP is image-only. | Add video pipeline post-MVP. | TBD |
| 5 | CDN worker is an external dependency, not in this repo. | Repo inspection (no `wrangler.toml`) | Deploy and validation of the worker is a separate process. | Must be deployed before media URLs work end-to-end. | Track worker deployment alongside backend release. | TBD |

---

## 16) Final go or no-go sign-off

### 16.1 Sign-off table

| Area | Owner | Ready (Y/N) | Blocker if N | Evidence link | Notes |
| --- | --- | --- | --- | --- | --- |
| Scope lock and routes | TBD | | | | |
| Auth and authz | TBD | | | | |
| Contracts and types | TBD | | | | |
| Safety and moderation | TBD | | | | |
| Profiles | TBD | | | | |
| Buddies | TBD | | | | |
| Messaging | TBD | | | | |
| Chika | TBD | | | | |
| Media | TBD | | | | |
| Guardrails (rate limits, pagination) | TBD | | | | |
| DB and migrations | TBD | | | | |
| CI and tests | TBD | | | | |
| Observability | TBD | | | | |
| Release execution | TBD | | | | |

### 16.2 Release decision

- Decision: `GO` / `NO-GO`
- Time decided (Asia/Manila): `TBD`
- Release Captain: `TBD`
- Blockers at decision time:
- Notes:
