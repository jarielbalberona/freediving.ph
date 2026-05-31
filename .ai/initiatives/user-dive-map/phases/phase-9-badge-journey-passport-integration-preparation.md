# Phase 9: Badge/Journey/Passport Integration Preparation Only

Status: pending

## Objective

Expose only the minimal future integration surface needed for downstream products to consume `user_dive_sites` later.

## Goal

Prepare stable integration points for future Badge, Dive Journey, and Dive Passport work without implementing those products.

## Scope

- Read-only or minimal read-model access around `user_dive_sites`.
- Backend docs or comments where current conventions support them.
- Tests proving visited-site stats can be derived from `user_dive_sites`.

## Out Of Scope

- No badge awarding.
- No badge definitions such as first dive site, 5 dive sites, Apo Island visitor, Dauin explorer, or Visayas explorer.
- No Dive Journey timelines.
- No Dive Passport summaries.
- No new UI for future products.
- No manual visit count.

## Non-Goals

- Do not add event buses, queues, cron jobs, or cache layers.
- Do not create placeholder UI.
- Do not implement downstream aggregation.

## Inputs

- Completed Dive Map read model and APIs.
- `01-domain-model.md`
- `03-cross-module-data-flow.md`
- Existing profile/badge docs or service boundaries from discovery.

## Tasks

- Identify the service/repository method future consumers should use for visited-site data.
- Ensure naming and tests make `user_dive_sites` the source for visited-site count.
- Add minimal documentation in the appropriate backend docs location if existing conventions support it.
- Do not import or call badge, Journey, or Passport modules unless a compile-only contract boundary already exists and Phase 1 approved it.

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
- No badge, Journey, or Passport implementation files are added.

## Repair Policy

Allowed repairs:

- naming/export fixes
- tests for read-model access
- documentation corrections
- formatting issues

Hard-stop if future integration requires product behavior, eventing infrastructure, badge rules, Journey timeline rules, Passport aggregation rules, or new dependencies.

## Stop Conditions

- Future integration cannot be prepared without implementing product behavior.
- Any required badge, Journey, or Passport rule is undefined.
- New infrastructure would be needed.

## Expected Report Output

- Integration point documented.
- Tests proving visited-site source.
- Confirmation that Badge, Journey, and Passport remain unimplemented.

## Completion Notes

Filled by the execution skill or runner.
