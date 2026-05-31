# Phase 9: Passport Integration Preparation Only

Status: passed

## Objective

Prepare Journey as a future Passport display input without implementing Passport or Passport stats.

## Goal

Prepare a read-only future integration path for Dive Passport display without implementing Dive Passport.

## Scope

- Journey read service/repository methods.
- Minimal documentation where existing conventions support it.
- Tests proving Journey remains display data, not Passport source-of-truth stats.

## Out Of Scope

- No Dive Passport implementation.
- No Passport public showcase UI.
- No stats aggregation.
- No badge verification.
- No certification verification.
- No Journey-to-Passport write pipeline.

## Non-Goals

- Do not create Passport source data.
- Do not implement Passport aggregate behavior.
- Do not let Passport stats depend on Journey entries.

## Dependencies

- Completed Journey read model and APIs.
- `03-cross-module-data-flow.md`.
- Existing Passport/profile/badge docs or service boundaries from discovery.

## Tasks

- Identify the read path future Passport display should use for Journey entries.
- Document that Passport stats must not be sourced from Journey entries.
- Add tests or static checks where practical to prove no Passport implementation files are added.
- Do not import or call Passport modules unless a compile-only contract boundary already exists and Phase 1 approved it.

## Verification Requirements

- Evidence must show Journey remains display data only.
- Diff review must prove no Passport implementation slipped in.
- Any future Passport read path must be read-only.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_journey/...`
- `pnpm --filter @freediving.ph/types type-check`
- `git diff --check`

## Expected Evidence

- Future Passport display integration point is documented.
- No Passport implementation is added.
- Journey remains a downstream display/storytelling layer.

## Repair Policy

Allowed repairs:

- naming/export fixes
- tests for read-model access
- documentation corrections
- formatting issues

Hard-stop if Passport integration preparation requires product behavior, stats aggregation rules, certification/badge verification rules, or new dependencies.

## Stop Conditions

- Passport integration requires product behavior.
- Passport stats or verification rules are needed.
- New dependencies or write pipeline would be required.

## Expected Report Output

- Future Passport display read path documented.
- Confirmation Passport implementation remains out of scope.
- Evidence Journey is not Passport source-of-truth stats.

## Completion Notes

Completed on 2026-05-31.

- Documented the future read-only Passport display path through `Service.ListProfileJourney`, `GET /v1/profiles/{username}/journey`, and shared `ProfileJourneyResponse`/`JourneyEntry` contracts.
- Documented that Passport stats, visited-site counts, badges, credentials, certifications, profile facts, and proof status must not be sourced from Journey entries.
- Added service guard tests proving Journey does not depend on Passport mutation/update APIs.
- Confirmed no Passport implementation files were added in this phase.
- Did not implement Passport aggregate behavior, Passport UI, stats aggregation, badge verification, certification verification, or Journey-to-Passport write pipelines.
