# Dive Memories Verification Plan

## Required Verification Categories

### Migration And sqlc

- Goose migration validation on local dev DB.
- Goose migration validation on local test DB when DB-dependent tests are added.
- `cd services/fphgo && make sqlc`
- Generated schema/query diff review.
- Non-destructive migration review.

### Backend Tests

- Go repository tests for memory CRUD, media links, tag lifecycle, visibility filters, and blocking filters.
- Go service tests for authorization, validation, source-of-truth invariants, and hard-stop edge cases.
- Go handler tests for request/response contracts, auth requirements, status codes, and route behavior.
- Route snapshot tests if route tables change.

### Source-Of-Truth Tests

Must prove:

- memories do not unlock Dive Map locations,
- memories do not increase visited-site counts,
- memories do not mutate `user_dive_sites`,
- own memories appear in an author map marker only when the author has `user_dive_sites` for the same `dive_site_id`,
- tagged/shared memories appear in a tagged user's marker only when that user has `user_dive_sites` for the same `dive_site_id` and tag status/visibility allows it,
- Journey never uses memories as proof,
- Passport never computes visited-site counts from memories,
- Badges are not awarded directly from memories.

### Privacy And Tagging Tests

Must prove:

- new tags default to `pending`,
- pending tags can be managed by tagged users where appropriate,
- pending tags are not publicly presented as accepted participation,
- accepted tags can be shown only under allowed visibility,
- declined tags suppress tagged-user association,
- hidden tags suppress tagged-user association,
- blocked users cannot be tagged,
- blocked users cannot access a memory through a tag,
- `private` memories are author-only,
- `tagged` memories are author plus allowed tagged users only,
- `followers` is either correctly implemented or explicitly deferred by phase report.

### Shared TypeScript Contracts

- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`

### Web Checks

- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web lint`

### Broader Checks

Run when scope and environment permit:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `git diff --check`

Do not run emulator or device tests during autonomous execution unless a future user explicitly requests them.

## Known Environment Caveat

Repo-level `pnpm test` has recently been blocked by unrelated mobile `@expo/ui` dependency drift. If that remains true during execution, document it clearly, run the narrowest relevant backend/shared/web checks for Dive Memories, and do not repair mobile dependency drift inside this initiative.

## Final Verification Requirements

The final report must include:

- exact commands run,
- pass/fail results,
- skipped commands and reasons,
- migration versions reached,
- files changed,
- source-of-truth invariant evidence,
- privacy/tagging evidence,
- unrelated drift classification,
- remaining risks,
- manual review checklist,
- explicit confirmation that memories do not unlock locations or inflate counts.
