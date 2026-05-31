# Phase 2: Passport Aggregate Contract Design

Status: passed

## Objective

Define the Passport aggregate contract so source ownership, fallbacks, and presentation settings are explicit before implementation.

## Goal

Design the Passport aggregate shape, section visibility behavior, and fallback states before backend implementation.

## Scope

- Initiative report output documenting aggregate shape.
- Proposed shared contract names and fields.
- Section fallback rules for profile summary, stats, map preview, badge showcase, journey highlights, recent memories/media, and settings.

## Out Of Scope

- No backend implementation.
- No web UI implementation.
- No database migration.
- No child-system implementation.

## Non-Goals

- Do not design a `dive_passports` table.
- Do not define fields that require duplicating child source data.
- Do not add reverse dependencies into child systems.

## Dependencies

- Phase 1 report.
- `01-domain-model.md`
- `03-cross-module-data-flow.md`
- Existing shared type conventions.

## Tasks

- Define the aggregate DTO structure for `profile_passport`.
- Define section-level empty states and optional/nullable fields.
- Define visibility filtering expectations by child system.
- Define settings fields only if Phase 1 confirms settings are safe.
- Define which source systems own each field.
- Explicitly reject any field that would require duplicating child source data.
- Define empty-state behavior for new profiles and missing map/journey/badge/memory/media data.

## Verification Requirements

- Every aggregate field must map to a source system or explicit empty/fallback value.
- Settings fields, if planned, must be presentation-only.
- Contract design must include diver summary, map preview, badge showcase, journey highlights, recent memories/media, and settings.

## Verification Commands

- `git diff -- .ai/initiatives/dive-passport`
- `rg "dive_passports|source of truth|presentation|fallback|visibility" .ai/initiatives/dive-passport`

## Expected Evidence

- Phase report includes aggregate DTO design.
- Phase report maps every Passport section to its source system.
- Phase report documents empty/fallback behavior.
- No application code changed.

## Repair Policy

Allowed repairs:

- documentation corrections inside this initiative.

Hard-stop for unresolved aggregate ownership, unresolved settings/featured badge behavior, or any aggregate field that requires Passport-owned source data.

## Stop Conditions

- Any field requires Passport-owned source truth.
- Settings/featured badge ordering behavior is unresolved.
- Empty-state behavior cannot be represented.

## Expected Report Output

- Aggregate DTO design.
- Section-to-source ownership map.
- Empty/fallback behavior.
- Settings design or deferral rationale.

## Completion Notes

Completed on 2026-05-31.

- Designed the Passport aggregate DTO in the phase report.
- Mapped every section to source owners or explicit fallback values.
- Confirmed settings remain presentation-only.
- Rejected `dive_passports` source-truth storage and all child source-data duplication.
- No application code, shared contracts, backend code, frontend code, or migrations were changed.
