# Backend Architecture

Status: baseline plus migrated legacy-doc truth / needs code confirmation

Primary sources:

- current repo inspection
- migrated from legacy root docs; validation status: needs code/runtime confirmation

Current canonical backend surface:

- `services/fphgo`
- Go API service

Supporting runtime/backend-adjacent surface:

- `services/cdn-worker` for CDN/media delivery behavior

Current architecture rules promoted into canon:

- new API work belongs in `services/fphgo`
- backend and web are separate workspaces in the monorepo
- shared contracts/types bridge web-facing API usage
- homepage mixed feed assembly belongs in the backend, not in `apps/web`
- v1 feed ranking is rule-based
- moderation, reporting, RBAC, and rate-limit rules are expected to be enforced server-side
