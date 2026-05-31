# Current State

The repository is a pnpm monorepo with:

- `apps/web`: Next.js web frontend.
- `apps/mobile`: mobile workspace present in the repo.
- `services/fphgo`: canonical Go backend for new API work.
- `packages/types`: shared TypeScript contracts.
- `packages/config`, `packages/db`, `packages/ui`, `packages/utils`: shared support packages.

AI memory V1 has been initialized as repository-local markdown under `.ai`. No application behavior depends on it.

Before executing an initiative phase, read the relevant `.ai/core` files, this state file, `known-risks.md`, `verification-status.md`, the initiative overview, and the current phase file.

## Initiatives

### `user-dive-map`

- Status: locked
- Ready for execution: yes
- Execution started: no
- Initiative path: `.ai/initiatives/user-dive-map/`
- Locked date: 2026-05-31
- Notes: User Dive Map is authored as a proof-based initiative. A user unlocks a dive site only through the user's own qualifying media post tagged to `dive_site_id`. Shared/tagged Dive Memories are social/contextual and must not unlock locations or inflate visited-site counts.

### `dive-journey`

- Status: locked
- Ready for execution: yes
- Execution started: no
- Initiative path: `.ai/initiatives/dive-journey/`
- Locked date: 2026-05-31
- Notes: Dive Journey is authored as the downstream storytelling/timeline layer. It supports manual, memory-based, generated, media-attached, and tagged-user entries, but must never become source of truth for Dive Map, visited-site counts, badges, certifications, credentials, or Dive Passport stats.

### `dive-passport`

- Status: locked
- Ready for execution: yes
- Execution started: no
- Initiative path: `.ai/initiatives/dive-passport/`
- Locked date: 2026-05-31
- Notes: Dive Passport is authored as the public diver identity/showcase layer. It is an aggregate/read model over Profile, Dive Map, Profile Badges, Dive Journey, media, memories, and summary stats, and must never become a competing source of truth or mutate child systems.
