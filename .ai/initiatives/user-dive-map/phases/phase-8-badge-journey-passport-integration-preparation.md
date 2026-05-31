# Phase 8: Badge/Journey/Passport Integration Preparation Only

Status: passed

## Objective

Expose only the minimal future integration surface needed for downstream products to consume `user_dive_sites` later.

## Goal

Prepare stable integration points for future Profile Badges, Dive Journey, and Dive Passport work without implementing those products.

## Scope

- Read-only or minimal read-model access around `user_dive_sites`.
- Backend docs or comments where current conventions support them.
- Tests proving visited-site stats can be derived from `user_dive_sites`.
- Shared source identifiers only where needed to keep future contracts aligned.

## Out Of Scope

- No badge awarding.
- No badge definitions such as first dive site, 5 dive sites, Apo Island visitor, Dauin explorer, or Visayas explorer.
- No Dive Journey timelines.
- No Dive Passport summaries.
- No Dive Memories.
- No new UI for future products.
- No manual visit count.

## Non-Goals

- Do not add event buses, queues, cron jobs, or cache layers.
- Do not create placeholder UI.
- Do not implement downstream aggregation.
- Do not create a memory-driven future hook.

## Inputs

- Completed Dive Map read model and APIs.
- `01-domain-model.md`
- `03-cross-module-data-flow.md`
- Existing profile/badge docs or service boundaries from discovery.

## Tasks

- Identify the service/repository method future consumers should use for visited-site data.
- Ensure naming and tests make `user_dive_sites` the source for visited-site count.
- Confirm Profile Badges transitional Dive Sites Visited fallback can be replaced or bypassed by `user_dive_sites` when present.
- Add minimal documentation in the appropriate backend docs location if existing conventions support it.
- Do not import or call badge, Journey, or Passport modules unless a compile-only contract boundary already exists and Phase 1 approved it.
- Recommend a future `dive-memories` initiative for memory privacy/tagging before memory content appears in map markers.

## Implementation Notes

- This phase should mostly document and stabilize boundaries.
- If adding code, keep it limited to read-model access that is already used or directly tested.
- Future products must consume `user_dive_sites`, not memories.

## Verification Requirements

- Tests must prove the exposed visited-site count uses `user_dive_sites`.
- Diff review must prove no downstream product implementation slipped in.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/profiles/...`
- `cd services/fphgo && go test ./internal/features/dive_map/...` if a Dive Map package exists.
- `cd services/fphgo && go test ./internal/features/media/...`
- `pnpm --filter @freediving.ph/types type-check`
- `git diff --check`

## Expected Evidence

- Tests prove visited-site count comes from `user_dive_sites`.
- Future integration point is documented or obvious from service naming.
- No badge, Journey, Passport, or Dive Memories implementation files are added.
- Future `dive-memories` initiative recommendation is documented in the phase report or final report.

## Repair Policy

Allowed repairs:

- naming/export fixes
- tests for read-model access
- documentation corrections
- formatting issues

Hard-stop if future integration requires product behavior, eventing infrastructure, badge rules, Journey timeline rules, Passport aggregation rules, memory privacy rules, or new dependencies.

## Stop Conditions

- Future integration cannot be prepared without implementing product behavior.
- Any required badge, Journey, Passport, or memory rule is undefined.
- New infrastructure would be needed.

## Expected Report Output

- Integration point documented.
- Tests proving visited-site source.
- Confirmation that Badge, Journey, Passport, and Dive Memories remain unimplemented.
- Follow-up recommendation for separate `dive-memories` initiative.

## Completion Notes

2026-05-31: Phase 8 passed. Documented the Dive Map read-model boundary and future consumer integration points without implementing badges, Journey, Passport, or Dive Memories. See `../reports/phase-8-badge-journey-passport-integration-preparation.md`.
