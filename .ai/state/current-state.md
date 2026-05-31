# Current State

The repository is a pnpm monorepo with:

- `apps/web`: Next.js web frontend.
- `apps/mobile`: mobile workspace present in the repo.
- `services/fphgo`: canonical Go backend for new API work.
- `packages/types`: shared TypeScript contracts.
- `packages/config`, `packages/db`, `packages/ui`, `packages/utils`: shared support packages.

AI memory V1 has been initialized as repository-local markdown under `.ai`. No application behavior depends on it.

Before executing an initiative phase, read the relevant `.ai/core` files, this state file, `known-risks.md`, `verification-status.md`, the initiative overview, and the current phase file.
