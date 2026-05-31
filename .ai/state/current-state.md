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
- Execution started: yes
- Initiative path: `.ai/initiatives/user-dive-map/`
- Locked date: 2026-05-31
- Relocked date: 2026-05-31
- Previous execution status: Phase 1 previously blocked on unresolved Dive Memories/tagged-user privacy rules before application code changes.
- Latest planning status: blocker resolved by scope correction. Dive Memories and tagged-user sharing are deferred from User Dive Map V1 and require a separate locked privacy/tagging specification.
- Latest execution status: completed on 2026-05-31. All User Dive Map V1 phases passed, final verification passed, and the initiative final report was written at `.ai/initiatives/user-dive-map/reports/final-report.md`.
- Notes: User Dive Map is authored as a proof-based initiative. A user unlocks a dive site only through the user's own qualifying media post tagged to `dive_site_id`. V1 marker contents show only the user's own qualifying media posts for that site. Shared/tagged memories must not unlock locations or inflate visited-site counts, and memory content must not appear in map markers until a separate Dive Memories initiative is specified and implemented.

### `dive-journey`

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Next execution target: yes
- Initiative path: `.ai/initiatives/dive-journey/`
- Locked date: 2026-05-31
- Latest execution status: completed on 2026-05-31. All Dive Journey phases completed, final verification passed, and the initiative final report was written at `.ai/initiatives/dive-journey/reports/final-report.md`.
- Notes: Dive Journey is authored as the downstream storytelling/timeline layer. It supports manual, generated, media-attached, and conditionally tagged-user entries, but must never become source of truth for Dive Map, visited-site counts, badges, certifications, credentials, or Dive Passport stats.

### `dive-passport`

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Initiative path: `.ai/initiatives/dive-passport/`
- Locked date: 2026-05-31
- Latest execution status: completed on 2026-05-31. All Dive Passport phases completed, final targeted verification passed, local `fph` and `fph_test` migrations reached version 86, and the initiative final report was written at `.ai/initiatives/dive-passport/reports/final-report.md`. Repo-level `pnpm test` is blocked by unrelated mobile Expo dependency drift outside Passport scope.
- Notes: Dive Passport is authored as the public diver identity/showcase layer. It is an aggregate/read model over Profile, Dive Map, Profile Badges, Dive Journey, media, memories, and summary stats, and must never become a competing source of truth or mutate child systems.

### `profile-experience-integration`

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Initiative path: `.ai/initiatives/profile-experience-integration/`
- Locked date: 2026-05-31
- Latest execution status: completed on 2026-05-31. All Profile Experience Integration phases completed, final targeted verification passed, and the initiative final report was written at `.ai/initiatives/profile-experience-integration/reports/final-report.md`. Repo-level `pnpm test` remains blocked by unrelated mobile Expo dependency drift outside integration scope.
- Notes: Profile Experience Integration is authored as the final cross-module audit/hardening initiative for Profile Badges, User Dive Map, Dive Journey, and Dive Passport. It verifies source-of-truth boundaries, visibility/privacy consistency, shared contracts, and public profile UX composition without changing locked product ownership rules.
