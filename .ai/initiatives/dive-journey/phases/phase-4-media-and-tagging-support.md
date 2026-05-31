# Phase 4: Media And Tagging Support

Status: passed_with_issues

## Objective

Add optional social attachments and tags without turning attachments or tags into proof.

## Goal

Add optional Journey media attachment and tagged-user support if Phase 1 confirmed both are feasible and safe for V1.

## Scope

- Journey backend service/repository queries for media attachments and tagged users.
- Existing media authorization checks.
- Existing user/buddy lookup patterns if present.
- Go tests for media attachment and tagged-user behavior.

## Out Of Scope

- No web UI changes.
- No notifications for tagged users.
- No proof behavior from media attachments or tags.
- No Dive Map, Badge, Passport, certification, event, or course implementation.

## Non-Goals

- Do not use media attachments to unlock locations.
- Do not let tagged users gain Journey ownership or Dive Map ownership.
- Do not add notifications unless separately approved.

## Dependencies

- Phase 1 report.
- Phase 2 schema.
- Phase 3 Journey APIs.
- Existing media and user/buddy conventions.

## Tasks

- Hard-stop if Phase 1 did not confirm media attachment support is feasible.
- Hard-stop if Phase 1 did not confirm tagged-user support is feasible and privacy-safe.
- Add attachment service/repository behavior for `journey_entry_media`.
- Add tagged-user service/repository behavior for `journey_entry_tagged_users`.
- Enforce media ownership/visibility rules.
- Enforce tagged user visibility/access rules.
- Ensure attachments and tags do not unlock locations or inflate counts.

## Verification Requirements

- Tests must prove unauthorized media cannot be attached.
- Tests must prove tags do not grant proof, ownership, badges, credentials, or visited counts.
- If tagging privacy is unclear, stop.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_journey/...`
- `cd services/fphgo && go test ./internal/features/media/...` if media behavior is touched.
- `cd services/fphgo && make sqlc`
- `git diff --check`

## Expected Evidence

- Tests prove valid media can be attached and sorted.
- Tests prove unauthorized media cannot be attached.
- Tests prove tagged users do not gain ownership or proof status.
- Tests prove attachments/tags do not affect `user_dive_sites`, badges, credentials, or Passport state.

## Repair Policy

Allowed repairs:

- Go compile failures
- sqlc drift
- service/repository test failures inside this phase scope
- formatting issues

Hard-stop for media ownership ambiguity, tagged-user privacy ambiguity, missing user lookup dependency, or any implementation path that treats attachments/tags as proof.

## Stop Conditions

- Media ownership is ambiguous.
- Tagged-user privacy or lookup is unavailable.
- Attachments/tags would be treated as proof.

## Expected Report Output

- Media/tagging support added or explicitly skipped with reason.
- Authorization and privacy evidence.
- Tests proving no proof/count side effects.

## Completion Notes

Completed with issues on 2026-05-31.

- Added owner-only Journey media attachment support through `journey_entry_media`.
- Media attachments require active media owned by the Journey entry owner.
- Attachments do not unlock Dive Map locations or mutate `user_dive_sites`.
- Tagged-user support was not implemented because Phase 1 found no reusable tagged-user acceptance/privacy model.
- A separate tagging/privacy decision is still required before Journey tagged users can be implemented safely.
