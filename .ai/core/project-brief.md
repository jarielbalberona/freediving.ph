# Project Brief

Freediving Philippines is a monorepo for a freediving community and marketplace product. The repository contains a Next.js web app, a Go API service, shared TypeScript packages, and supporting infrastructure.

The product direction is community-first: discovery, dive sites, schools, instructors, buddies, trips, content, and trust workflows should reinforce a credible local freediving network rather than become a generic booking clone.

Primary engineering priorities:

- Keep new API work in `services/fphgo`.
- Keep web UX in `apps/web`.
- Keep shared TypeScript contracts in `packages/types`.
- Preserve backward compatibility unless an initiative explicitly authorizes a breaking change.
- Prefer simple, auditable implementation over speculative infrastructure.

V1 AI memory exists to make future autonomous implementation less chaotic. It is not a product feature and must not leak into runtime behavior.
