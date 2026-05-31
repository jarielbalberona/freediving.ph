# Architecture Rules

- `services/fphgo` is the canonical backend for new API work. Do not add new behavior to legacy API locations.
- `apps/web` is the primary web frontend and follows Next.js App Router conventions.
- Shared request/response contracts belong in `packages/types/src`.
- Shared runtime constants belong in `packages/config`.
- Shared utilities belong in `packages/utils`; do not hide product-specific logic there.
- Shared UI belongs in `packages/ui` only when it is genuinely reusable.
- Do not create feature-local `types.ts` files in `apps/web/src/features/*` for contracts that cross API boundaries.
- Keep handlers/controllers thin. Put business behavior in services or feature modules.
- Do not add database, queue, cache, or cloud dependencies without an explicit initiative requirement.
- Prefer targeted tests around contract boundaries and critical business rules.

When architecture and speed conflict, choose the simplest design that keeps the next likely change cheap. Overbuilding V1 infrastructure is technical debt with better branding.
