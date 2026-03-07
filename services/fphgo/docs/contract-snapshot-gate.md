# Contract Snapshot Gate (v1)

This repo has a contract gate for API route surface and core JSON invariants in:

- `internal/app/routes_contract_test.go`
- `internal/app/routes_snapshot_test.go`

## What is enforced

- Route invariants:
  - no duplicate `method + pattern` registrations
  - API routes must live under `/v1` (except operational endpoints like `/healthz`, `/readyz`, and legacy profile route)
- Core JSON contract invariants for selected endpoints:
  - `GET /v1/me`
  - `GET /v1/me/profile`
  - `GET /v1/blocks`
  - `GET /v1/reports`
- Route surface snapshot:
  - method + route pattern list in `internal/app/testdata/route_surface.snapshot.json`

## Updating snapshot intentionally

When route changes are intentional, regenerate snapshot and commit it with the route/code change:

```bash
cd services/fphgo
UPDATE_SNAPSHOTS=1 go test ./internal/app -run TestRouteSurfaceSnapshot
go test ./internal/app
```

Review checklist before commit:

1. Every new API route is under `/v1` unless explicitly operational.
2. No accidental route removals.
3. Permission/auth expectations in `routes_contract_test.go` still match intended behavior.
4. If JSON keys/types changed intentionally, update invariant assertions in `routes_contract_test.go` in the same PR.
