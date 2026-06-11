# Troubleshooting

Status: baseline plus migrated legacy-doc truth / needs code confirmation

Primary sources:

- current repo inspection
- migrated from legacy root docs; validation status: needs code/runtime confirmation

High-signal repo-level checks:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm preflight`
- workspace-targeted `pnpm --filter ...`
- Go-specific commands such as `pnpm test:go`, `pnpm sqlc:go`, and `pnpm migrate:go`

Operational runbook expectations promoted into canon:

- incident handling should use severity levels, explicit containment, and factual checkpoint updates
- backup/restore drills should validate schema drift, critical table counts, readiness endpoints, and key authenticated flows
- moderation operations must confirm placeholder rendering, public suppression, and audit-log creation after enforcement
