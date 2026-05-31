# Phase 7: Dive Memories UI And Tagging

Status: pending

## Objective

Add web memory and tagging flows that display social/contextual content only where backend authorization allows it.

## Goal

Add web UI for Dive Memories creation, reading, updating, deleting, media attachments, and tagging only if Phase 6 implemented backend support.

## Scope

- `packages/types/src/api` contract additions or refinements.
- Web feature code under existing profile/media patterns or a new locally consistent Dive Memories feature folder.
- Profile Dive Map marker detail UI for allowed memories.
- Tests for memory UI and tagging flows where existing web test patterns support them.

## Out Of Scope

- No backend feature expansion beyond contract mismatch fixes.
- No memory-driven unlock behavior.
- No Journey/Passport/Badge implementation.
- No advanced map filters or region grouping.

## Non-Goals

- Do not let the UI create visited-site state directly.
- Do not infer shared memory visibility client-side.
- Do not add broad user-search infrastructure unless it already exists or Phase 1 approved it.

## Inputs

- Phase 6 backend APIs and contracts.
- Phase 5 profile Dive Map UI.
- `01-domain-model.md`
- Existing web form, modal/drawer, and API hook conventions.

## Tasks

- Hard-stop immediately if Phase 6 did not implement Dive Memories backend.
- Add or refine shared TypeScript contracts for memory CRUD and tagging.
- Add UI for author-created memories at a dive site.
- Add tagged user controls using existing user search/buddy patterns if available.
- Show tagged/shared memories in marker detail only when backend returns them for unlocked sites.
- Avoid client-side inference that a shared memory unlocks a site.
- Add tests for locked vs unlocked shared memory rendering where practical.

## Implementation Notes

- Backend responses decide whether shared/tagged memories appear in marker details.
- The UI may show memory access errors, but must not convert them into unlocked map state.
- Use existing profile/media form and dialog patterns where possible.

## Verification Requirements

- Web and shared contract checks are mandatory.
- Tests or documented static inspection must cover locked shared-memory behavior.

## Verification Commands

- `pnpm --filter @freediving.ph/types type-check`
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web type-check`
- `pnpm --filter @freediving.ph/web test`
- `pnpm --filter @freediving.ph/web lint`
- `git diff --check`

## Expected Evidence

- Web and shared type checks pass.
- UI tests or documented manual inspection path prove locked shared memories are not rendered as unlocked markers.
- UI uses shared contracts, not feature-local cross-boundary DTOs.
- Memory UI states handle create/edit/delete/tagging errors without hiding authorization failures.

## Repair Policy

Allowed repairs:

- TypeScript compile failures
- lint failures
- contract mismatches
- web test failures inside changed memory/profile modules
- formatting issues

Hard-stop for unresolved UX decisions around tagging controls, missing user lookup capability, privacy ambiguity, or backend behavior that does not enforce the unlock rule.

## Stop Conditions

- Phase 6 did not ship backend support.
- Tagging UI requires a user lookup flow that does not exist and was not approved.
- Privacy behavior cannot be represented clearly in UI states.
- Backend does not enforce unlock rules.

## Expected Report Output

- Memory UI files changed.
- Contract changes, if any.
- Tagging behavior implemented.
- Evidence that UI does not unlock or count sites from memories.

## Completion Notes

Filled by the execution skill or runner.
