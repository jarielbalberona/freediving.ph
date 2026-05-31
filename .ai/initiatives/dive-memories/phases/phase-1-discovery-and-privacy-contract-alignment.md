# Phase 1: Discovery And Privacy Contract Alignment

Status: passed

Allowed values: `pending`, `in_progress`, `repairing`, `passed`, `passed_with_issues`, `blocked`, `failed`.

Do not use `completed` or `done`.

## Goal

Confirm the existing repo contracts needed to implement Dive Memories safely before schema or code changes.

## Scope

- `.ai/initiatives/user-dive-map/**`
- `.ai/initiatives/dive-journey/**`
- `.ai/initiatives/dive-passport/**`
- `.ai/initiatives/profile-experience-integration/**`
- `services/fphgo/internal/features/profiles`
- `services/fphgo/internal/features/dive_map`
- `services/fphgo/internal/features/dive_journey`
- `services/fphgo/internal/features/dive_passport`
- existing media, user blocking, follower/saved-user, auth, validation, and route patterns in `services/fphgo`
- existing profile web composition in `apps/web/src/features/profile`

## Out Of Scope

- No backend implementation.
- No frontend implementation.
- No migrations.
- No shared contract changes.

## Inputs

- This initiative overview and domain files.
- Four completed profile experience final reports.
- Existing repo code for blocking, saved/follower visibility, media ownership, and profile visibility.

## Tasks

- Confirm how existing `user_blocks` behavior is queried and enforced.
- Confirm whether existing `saved_users` follower semantics are acceptable for `followers` memory visibility.
- Confirm media ownership checks available for attaching media to memories.
- Confirm current Dive Map marker detail read boundary.
- Confirm Journey generated-entry source conventions.
- Confirm Passport memory placeholder/read boundary.
- Confirm Profile Badges no-memory source rule.
- Document final V1 privacy decision: support `public`, `tagged`, `private`, and `followers` only if technically safe.
- Hard-stop if blocking/tagging/follower visibility cannot be specified from repo truth.

## Verification Commands

- `rg -n "user_blocks|saved_users|followers|blocking|blocked" services/fphgo/internal services/fphgo/db`
- `rg -n "user_dive_sites|dive-map|dive_map|passport|journey|badges" services/fphgo/internal packages/types/src apps/web/src/features/profile`
- `git diff --check`

## Expected Evidence

- Report identifies exact files/functions that own blocking, follower/saved-user, media ownership, Dive Map marker, Journey, Passport, and Badge boundaries.
- Report states whether `followers` visibility is in V1 or deferred.
- No application code changed.

## Repair Policy

Allowed repairs: documentation corrections only.

Hard-stop on privacy, blocking, follower, tag status, or source-of-truth ambiguity.

## Completion Notes

Completed on 2026-05-31.

- Existing `user_blocks` is the canonical block source for memory tag/access filtering.
- Existing `saved_users` follower semantics are technically available and already used by Dive Journey, so `followers` is in V1.
- Media ownership/authorization, Dive Map, Journey, Passport, and Badge boundaries were found in repo code.
- No application code was changed in this phase.
