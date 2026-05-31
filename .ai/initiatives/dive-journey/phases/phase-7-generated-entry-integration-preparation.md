# Phase 7: Generated-Entry Integration Preparation

Status: passed

## Objective

Prepare safe generated-entry mechanics that prevent duplicates and keep upstream systems authoritative.

## Goal

Prepare idempotent generated-entry integration points for future Dive Map, Badges, events/courses, and media milestones without implementing those source systems.

## Scope

- Journey service/repository helpers for generated entries.
- Tests for idempotency by `source_type` and `source_id`.
- Minimal backend docs or comments where current conventions support them.

## Out Of Scope

- No Dive Map implementation.
- No badge earning or verification implementation.
- No event/course integration unless already available and explicitly cheap.
- No Passport implementation.
- No noisy activity generation for likes, caption edits, follows, or profile edits.

## Non-Goals

- Do not implement upstream milestone producers.
- Do not create eventing infrastructure.
- Do not make Journey the source of truth for generated source systems.

## Dependencies

- Completed Journey schema and APIs.
- `01-domain-model.md`.
- `03-cross-module-data-flow.md`.
- Existing profile/badge/map/event/media boundaries from discovery.

## Tasks

- Add or document a service method for creating/upserting generated Journey entries.
- Enforce idempotency by `source_type` and `source_id` where appropriate.
- Add tests proving duplicate source events do not create duplicate generated entries.
- Ensure generated entries remain display artifacts only.
- Document that future systems must not use Journey as their source of truth.

## Verification Requirements

- Tests must prove duplicate source events do not create duplicate entries.
- Tests must prove regeneration is safe.
- Integration points must require `source_type` and `source_id` where idempotency applies.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_journey/...`
- `pnpm --filter @freediving.ph/types type-check`
- `git diff --check`

## Expected Evidence

- Tests prove generated-entry idempotency.
- Integration point is documented or obvious from service naming.
- No Dive Map, Badge, event/course, media milestone, or Passport source-system behavior is implemented.

## Repair Policy

Allowed repairs:

- service naming/export fixes
- repository query corrections
- tests for idempotency
- documentation corrections
- formatting issues

Hard-stop if integration preparation requires implementing upstream product behavior, eventing infrastructure, badge rules, Dive Map rules, Passport aggregation, or new dependencies.

## Stop Conditions

- Idempotency cannot be represented by `source_type` and `source_id`.
- Regeneration semantics are ambiguous.
- Upstream product behavior would need to be implemented.
- New infrastructure would be required.

## Expected Report Output

- Generated-entry integration point documented or implemented.
- Idempotency and duplicate-prevention evidence.
- Confirmation no upstream producer behavior was implemented.

## Completion Notes

Completed on 2026-05-31.

- Added a display-only generated-entry upsert path in the Dive Journey repository/service.
- Enforced generated-entry source identity by requiring non-empty `source_type` and `source_id`.
- Used the existing partial unique index on `(user_id, source_type, source_id, type)` to make regeneration idempotent.
- Added repository integration coverage proving duplicate source events update one row instead of creating duplicates.
- Added service coverage proving generated source identity is required and that the service has no Dive Map/badge credential mutation dependency.
- Did not add upstream producers, eventing infrastructure, Dive Map behavior, badge awarding, Passport aggregation, or media milestone generation.
