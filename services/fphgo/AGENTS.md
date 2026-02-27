# AGENTS.md

## Purpose

This service is `fphgo`: a Go 1.26 backend using Chi, PostgreSQL (`pgxpool`), per-feature `sqlc`, goose migrations, and single-instance in-memory WebSocket hub. No Redis in v1.

This file defines non-negotiable engineering rules for AI coding agents.

## Repo Navigation And Commands

- Core commands:
  - `make dev-deps` (one-time: installs Air for live reload)
  - `make dev`
  - `make test`
  - `make sqlc`
  - `make migrate-up`
  - `make migrate-down`
- `sqlc` config: `services/fphgo/sqlc.yaml`
- DB schema SQL: `services/fphgo/db/schema/`
- Goose migrations: `services/fphgo/db/migrations/`
- Feature SQL/query files should stay grouped by domain (for example `db/queries/users`, `db/queries/messaging`, `db/queries/chika`, `db/queries/explore`).

## Architecture Rules (Non-Negotiable)

- Keep HTTP handlers thin.
  - Handlers parse input, call service methods, map errors to HTTP responses.
  - No policy logic in handlers.
- Business rules live in service layer.
  - Acceptance gating, buddy bypass, pending previews, cooldowns, and rate limits must be enforced in service logic.
- Repository layer is DB access only.
  - No policy decisions in repositories.
  - Repos execute typed `sqlc` methods and return domain-safe data/errors.
- `sqlc` queries must encode visibility/state constraints where possible.
  - Avoid fetching broad data then filtering in Go for core visibility/security predicates.
- Do not build one giant `db` package.
  - Keep per-feature `sqlc` generation outputs and package boundaries (`users`, `messaging`, `chika`, `explore`).
- Do not introduce DI frameworks.
  - Use explicit constructors and interfaces.
- Tests are mandatory for behavior changes.
  - Add/adjust service tests for policy rules.
  - Add/adjust repo/query tests where practical for constraints and joins.

## Request Validation Rules (Non-Negotiable)

- Use `internal/shared/validatex` and `internal/shared/httpx` for all request validation.
  - `validatex.New()` creates a singleton `*validator.Validate` (go-playground/validator/v10) with json tag name resolution.
  - Instantiate once in `app.go` (`BuildDependencies`) and pass to handler constructors via `httpx.Validator` interface.
- All POST/PUT/PATCH handlers must use `httpx.DecodeAndValidate[T](r, h.validator)` to decode and validate request bodies.
  - Do not call `json.NewDecoder`, `httpx.DecodeJSON`, or `validator.Struct` directly inside handlers.
  - On failure, respond with `httpx.WriteValidationError(w, issues)`.
- All request DTO structs must have both `json` and `validate` tags.
  - Use `required`, `min`, `max`, `email`, `uuid`, `oneof`, `url` tags where applicable.
- Validation error response shape (all endpoints, no exceptions):
  ```json
  {
    "error": {
      "code": "validation_error",
      "message": "Invalid request",
      "issues": [{ "path": ["field"], "code": "...", "message": "..." }]
    }
  }
  ```
- Issue codes: `required`, `invalid_email`, `invalid_uuid`, `too_small`, `too_big`, `invalid_enum`, `invalid_url`, `invalid_datetime`, `custom` (validator tags); `unrecognized_key`, `invalid_type` (JSON decode errors); `invalid_json` (malformed body).
- For GET routes with path/query params, keep separate param parsing helpers (do not force into `DecodeAndValidate`).
- Do not add new external validation libraries; `go-playground/validator/v10` is the sole validation dependency.

## Messaging Policy Rules (Must Enforce)

- DM can target any user unless blocked/forbidden by visibility rules.
- If users are buddies, DM is active immediately.
- If users are not buddies, conversation starts in pending state and requires recipient acceptance.
- Recipient can preview pending messages.
- Multiple pending messages are allowed before acceptance.
- Service layer must enforce sender rate limits and cooldown windows.
- Transition rules (`pending -> accepted`, reject/expire paths) must be explicit and tested.

## WebSocket Rules

- Hub/client send channel must be bounded.
  - On send buffer overflow, disconnect that client.
- Implement heartbeat and deadlines.
  - Server ping ticker.
  - Read/write deadlines and pong handler updates.
- Standardize envelope contract.
  - Include `version`, `type`, `ts`, and `payload` fields.
  - Treat envelope versioning as backward-compat contract; additive changes preferred.
  - Breaking envelope changes require version bump and compatibility note in docs.

## Security And Privacy Rules

- Enforce block lists and visibility rules server-side.
  - Never rely on client filtering for access control.
- Auth uses Clerk session JWTs from `Authorization: Bearer <token>`.
  - Use `clerkhttp.WithHeaderAuthorization` + `clerk.SessionClaimsFromContext`.
  - Do not use deprecated `session.Verify` style token verification.
  - Global auth attachment is optional; protected routes must enforce `RequireMember` and return 401 JSON.
  - `/ws` must always require authenticated claims before websocket accept.
- Protect pseudonymous Chika identity.
  - Do not expose real user identifiers in pseudonymous responses/events.
  - Keep mapping from pseudonymous actor to real user internal-only.
- Moderator action auditability is required.
  - If full audit subsystem is deferred, create minimal structured audit event writes and TODOs with owner.
  - Moderator actions (hide/remove/suspend/restore/resolve) must be traceable.

## Review Checklist For Every PR

- Layering:
  - Handlers thin, service owns policy, repo owns data access.
- Request validation:
  - All write endpoints use `httpx.DecodeAndValidate` (no raw `json.NewDecoder` or `validator.Struct` in handlers).
  - Request DTOs have `json` + `validate` tags.
  - Validation errors use the standard `validation_error` shape with `issues` array.
- Data boundaries:
  - Per-feature `sqlc` outputs preserved.
  - No cross-feature leakage without explicit interface.
- Messaging rules:
  - Buddy immediate activation.
  - Non-buddy pending flow with preview and multi-pending support.
  - Rate limit and cooldown logic validated.
- WebSocket safety:
  - Bounded buffers, overflow disconnect, heartbeat/deadlines present.
- Security/privacy:
  - Server-side enforcement of blocks/visibility.
  - No pseudonymous identity leaks.
  - Audit hooks for moderation actions.
- Tests:
  - Unit tests for service policies.
  - Integration/repo tests for critical queries and constraints where practical.

## Definition Of Done

- Quality gates pass:
  - `gofmt` clean
  - `go vet ./...` clean
  - `go test ./...` passing
- `sqlc generate` (or `make sqlc`) runs clean with no drift.
- Required migration files are added/updated and reversible where needed.
- Endpoint changes are documented in a short list in PR description or service docs:
  - method + path
  - auth requirement
  - request/response summary
  - error cases
