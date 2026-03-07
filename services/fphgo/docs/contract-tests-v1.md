# Contract Tests v1

## Purpose

Guard against accidental API surface breakage. The test suite has two layers:

1. **Invariant tests** — fail when structural rules are violated (no snapshots to maintain).
2. **Snapshot tests** — fail when the registered route set changes from a known-good baseline.

## Test files

| File | What it tests |
|------|---------------|
| `internal/app/routes_contract_test.go` | JSON shape invariants, auth guards, validation error contract |
| `internal/app/routes_snapshot_test.go` | Full route surface snapshot + prefix/duplicate invariants |
| `internal/app/routes_test.go` | Health / readiness endpoints |

## Invariant tests (no maintenance needed)

These tests run against a contract router with stub responses and verify structural rules:

- **`TestV1RoutePrefixIsRequired`** — paths without `/v1` return 404.
- **`TestV1CoreEndpointsRequireAuth`** — unauthenticated requests to core endpoints return 401 with `unauthenticated` error code.
- **`TestV1CoreEndpointContracts`** — JSON shapes for `/v1/me`, `/v1/me/profile`, `/v1/auth/session`, `/v1/messages/inbox`, `/v1/chika/threads`, `/v1/blocks`, `/v1/buddies`, `/v1/reports` include expected keys and types.
- **`TestValidationErrorContractIncludesIssues`** — validation errors include `issues` array.
- **`TestAuthStateGuardsOnProtectedAndWriteRoutes`** — `read_only` and `suspended` users cannot write; missing permissions return 403.
- **`TestRouteSurfaceInvariantsFullSurface`** — all routes start with `/v1/` (exceptions: `/healthz`, `/readyz`, `/profiles/{username}`), no duplicate method+pattern pairs, minimum route count sanity check.

## Snapshot test

**`TestRouteSurfaceSnapshot`** captures the full API route surface in `internal/app/testdata/route_surface.snapshot.json`.

It uses `buildFullSurfaceRouter()` which constructs real feature route registrations (with nil services — safe because `chi.Walk` enumerates patterns without invoking handlers).

### When the snapshot test fails

The test fails when a route is added, removed, or renamed. The failure message includes the update command.

### How to update the snapshot

```bash
cd services/fphgo
UPDATE_SNAPSHOTS=1 go test ./internal/app/ -run TestRouteSurfaceSnapshot
```

Then commit the updated `testdata/route_surface.snapshot.json`.

### Adding a new feature

1. Add the handler constructor call to `buildFullSurfaceRouter()` in `routes_snapshot_test.go`.
2. Run `UPDATE_SNAPSHOTS=1 go test ./internal/app/ -run TestRouteSurfaceSnapshot`.
3. If the endpoint should be auth-guarded, add it to `TestV1CoreEndpointsRequireAuth`.
4. If the endpoint returns a JSON shape worth locking, add a sub-test in `TestV1CoreEndpointContracts` with a stub response in `buildContractRouter()`.

## CI

All tests run with `go test ./internal/app/...` — no special flags needed. The snapshot test reads the committed snapshot file and fails if the current surface doesn't match.
