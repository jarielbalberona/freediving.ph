# Troubleshooting

Status: baseline / to be confirmed

Source: current repo inspection.

High-signal repo-level checks currently exposed:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm preflight`
- workspace-targeted `pnpm --filter ...`
- Go-specific commands such as `pnpm test:go`, `pnpm sqlc:go`, and `pnpm migrate:go`

This seed pass does not yet promote detailed operational runbooks from legacy root docs.
