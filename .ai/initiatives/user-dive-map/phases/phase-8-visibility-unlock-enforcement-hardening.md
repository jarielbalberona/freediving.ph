# Phase 8: Visibility/Unlock Enforcement Hardening

Status: pending

## Objective

Stress-test and harden all proof, visibility, and marker-content boundaries after the core feature exists.

## Goal

Prove the hard rule: shared/tagged memories can be accessible socially but cannot unlock dive sites, inflate visited counts, or appear inside locked markers.

## Scope

- Backend service and handler tests for Dive Map and Dive Memories.
- Shared contract tests if visibility states are encoded in DTOs.
- Web tests for visible marker contents where applicable.
- Targeted fixes only where tests expose violations of the initiative rules.

## Out Of Scope

- No new product features.
- No badge, Journey, or Passport work.
- No new visibility states without product approval.
- No broad refactors unrelated to enforcement.

## Non-Goals

- Do not expand scope to new filters, regions, favorites, or manual counts.
- Do not weaken authorization rules to make tests easier.
- Do not alter the locked product specification.

## Inputs

- Completed Phases 3 through 7.
- `01-domain-model.md`
- `03-cross-module-data-flow.md`
- Existing auth/visibility test helpers.

## Tasks

- Add or strengthen tests proving shared/tagged memories do not create `user_dive_sites`.
- Add or strengthen tests proving shared/tagged memories do not increase visited-site count.
- Add or strengthen tests proving shared/tagged memories appear in marker detail only when tagged user has unlocked the site.
- Add authorization tests for private memories and private markers.
- Fix only code paths that violate these rules.

## Implementation Notes

- This is a hardening phase. Prefer focused tests and narrow fixes over feature work.
- If tests expose a product contradiction, stop instead of inventing a rule.

## Verification Requirements

- Tests must cover the negative cases, not just happy paths.
- Any fix must include the failing scenario that justified it.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/media/...`
- `cd services/fphgo && go test ./internal/features/profiles/...`
- `cd services/fphgo && go test ./internal/features/dive_map/...` if a Dive Map package exists.
- `cd services/fphgo && go test ./internal/features/dive_memories/...` if a Dive Memories package exists.
- `pnpm --filter @freediving.ph/types test`
- `pnpm --filter @freediving.ph/web test`
- `git diff --check`

## Expected Evidence

- Tests fail if a tagged memory unlocks a site.
- Tests fail if a tagged memory increments visited-site count.
- Tests fail if marker detail returns shared memory for a locked site.
- Tests pass after enforcement.
- Phase report names any remaining visibility risk.

## Repair Policy

Allowed repairs:

- service logic corrections inside Dive Map/Dive Memories/profile/media scope
- repository query corrections
- contract test corrections
- web rendering guard fixes
- formatting issues

Hard-stop if enforcing the rules conflicts with existing auth/visibility behavior, requires new product states, or exposes contradictory source-of-truth assumptions.

## Stop Conditions

- Existing auth/visibility behavior conflicts with the locked sharing rule.
- Enforcement requires a new product state or user-facing policy.
- A fix would require broad refactoring outside Dive Map/Dive Memories/media/profile boundaries.

## Expected Report Output

- Enforcement tests added or strengthened.
- Bugs found and fixed, if any.
- Remaining visibility risks.
- Evidence that shared/tagged memories do not unlock, count, or appear in locked markers.

## Completion Notes

Filled by the execution skill or runner.
