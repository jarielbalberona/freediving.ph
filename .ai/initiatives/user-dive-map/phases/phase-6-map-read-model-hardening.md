# Phase 6: Map Read Model Hardening

Status: pending

## Objective

Stress-test and harden the proof-based read model after schema, derivation, APIs, contracts, and initial UI exist.

## Goal

Prove that `user_dive_sites` is the only V1 source for unlocked markers, visited-site counts, and marker detail access.

## Scope

- Backend service and repository tests for Dive Map.
- Media lifecycle derivation tests.
- Profile/Dive Map handler tests.
- Shared contract tests if marker DTOs need stronger shape assertions.
- Targeted fixes only where tests expose violations of V1 proof rules.

## Out Of Scope

- No new product features.
- No Dive Memories.
- No badge, Journey, or Passport implementation.
- No new visibility states without product approval.
- No broad refactors unrelated to proof/read-model enforcement.

## Non-Goals

- Do not expand scope to filters, regions, favorites, want-to-visit, memories, or manual counts.
- Do not weaken authorization rules to make tests easier.
- Do not alter the locked proof specification.

## Inputs

- Completed Phases 3 through 5.
- `01-domain-model.md`
- `03-cross-module-data-flow.md`
- Existing auth/visibility test helpers.

## Tasks

- Add or strengthen tests proving only qualifying owned media posts create `user_dive_sites`.
- Add or strengthen tests proving disqualified/deleted/untagged media removes or recomputes markers.
- Add or strengthen tests proving non-proof sources do not create markers or inflate visited-site count.
- Add or strengthen tests proving marker detail requires an existing unlocked marker.
- Add or strengthen tests proving marker detail returns only the target user's own qualifying media posts.
- Fix only code paths that violate these rules.

## Implementation Notes

- This is a hardening phase. Prefer focused tests and narrow fixes over feature work.
- If tests expose a product contradiction, stop instead of inventing a rule.

## Verification Requirements

- Tests must cover negative cases, not just happy paths.
- Any fix must include the failing scenario that justified it.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/media/...`
- `cd services/fphgo && go test ./internal/features/profiles/...`
- `cd services/fphgo && go test ./internal/features/dive_map/...` if a Dive Map package exists.
- `pnpm --filter @freediving.ph/types test`
- `git diff --check`

## Expected Evidence

- Tests fail if a non-owned media post unlocks a site.
- Tests fail if non-proof sources increment visited-site count.
- Tests fail if marker detail returns content for a locked site.
- Tests fail if marker detail returns memory-derived content.
- Tests pass after enforcement.
- Phase report names any remaining proof or visibility risk.

## Repair Policy

Allowed repairs:

- service logic corrections inside Dive Map/profile/media scope
- repository query corrections
- contract test corrections
- formatting issues

Hard-stop if enforcing the rules conflicts with existing auth/visibility behavior, requires new product states, or exposes contradictory source-of-truth assumptions.

## Stop Conditions

- Existing auth/visibility behavior conflicts with the locked proof rule.
- Enforcement requires a new product state or user-facing policy.
- A fix would require broad refactoring outside Dive Map/media/profile boundaries.
- Any fix requires Dive Memories or tagged-user sharing behavior.

## Expected Report Output

- Enforcement tests added or strengthened.
- Bugs found and fixed, if any.
- Remaining visibility/proof risks.
- Evidence that only owned proof media unlocks, counts, and appears in marker detail.

## Completion Notes

Filled by the execution skill or runner.
