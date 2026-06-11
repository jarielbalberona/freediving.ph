# Frontend Architecture

Status: baseline / to be confirmed

Source: current repo inspection.

Current primary frontend surface:

- `apps/web`
- Next.js App Router
- React
- TypeScript
- Tailwind CSS

Observed frontend support surfaces:

- shared UI package shell in `packages/ui`
- shared type contracts in `packages/types`
- shared utilities/config packages

The repo README and AGENTS entry files indicate UI work should follow the existing workspace component patterns rather than ad hoc local conventions.
