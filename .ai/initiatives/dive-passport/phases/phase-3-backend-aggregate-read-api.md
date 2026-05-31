# Phase 3: Backend Aggregate Read API

Status: passed

## Objective

Implement a backend read path that composes Passport data without mutating source systems.

## Goal

Implement a read-only backend Passport aggregate API with visibility filtering and safe child-system fallbacks.

## Scope

- Passport aggregate handler/service/repository if needed.
- Profile integration if the route belongs under profile.
- `services/fphgo/internal/app/routes.go`.
- Route tests and snapshots.
- Go tests for aggregate service and handlers.

## Out Of Scope

- No settings schema/API.
- No web UI changes.
- No Dive Map, Dive Journey, Badge, certification, media, or memory implementation beyond read integration.
- No source-data duplication.

## Non-Goals

- Do not unlock Dive Map locations.
- Do not create Journey entries.
- Do not award badges or verify credentials.
- Do not create a Passport source table.

## Dependencies

- Phase 1 report.
- Phase 2 aggregate contract design.
- Existing auth, validation, and HTTP helper conventions.

## Tasks

- Add read-only Passport aggregate service.
- Add handler/route following existing profile/public route conventions.
- Read profile summary and available child section data.
- Apply visibility filtering in the service layer.
- Return stable fallback sections when child systems are unavailable or empty.
- Add tests proving no child source data is mutated.
- Update route snapshot tests if routes change.

## Verification Requirements

- Tests must prove read-only behavior against Map, Journey, Badges, credentials, memories, and media.
- Tests must prove child visibility filtering.
- Tests must prove stable fallback for unavailable/empty child systems.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_passport/...` if a Passport package exists.
- `cd services/fphgo && go test ./internal/features/profiles/...` if profile paths are touched.
- `cd services/fphgo && go test ./internal/app/...`
- `git diff --check`

## Expected Evidence

- Tests prove aggregate reads visible child data.
- Tests prove fallback behavior for missing child systems.
- Tests prove Passport does not create/mutate Dive Map locations, Journey entries, or badges.
- Route snapshot changes are intentional and documented.

## Repair Policy

Allowed repairs:

- Go compile failures.
- handler/service test failures inside this phase scope.
- route snapshot drift.
- formatting issues.

Hard-stop for auth ambiguity, child visibility ambiguity, unavailable/contradictory child contracts, or any need to duplicate source data.

## Stop Conditions

- Auth/public profile read behavior is ambiguous.
- Child visibility rules are contradictory.
- Aggregate cannot be implemented without duplicating source data.
- Child contracts are unavailable and fallback is undefined.

## Expected Report Output

- Routes and aggregate service added.
- Source systems read.
- Fallback behavior implemented.
- Tests proving read-only boundaries.

## Completion Notes

Completed on 2026-05-31.

- Added read-only `services/fphgo/internal/features/dive_passport` service and HTTP handler.
- Added public route `GET /v1/profiles/{username}/passport`.
- Aggregates profile summary, Dive Map preview, Profile Badges, Journey highlights, media fallback, memories fallback, and default presentation settings.
- Uses existing child read services and returns stable empty/unavailable section states.
- Added tests proving visible child data composition, unavailable child fallback, and no source mutation dependencies.
- Did not add settings schema/API, migrations, web UI, source-system writes, badge verification, certification authority, or Passport source tables.
