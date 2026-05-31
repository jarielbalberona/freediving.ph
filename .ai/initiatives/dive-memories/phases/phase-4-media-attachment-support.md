# Phase 4: Media Attachment Support

Status: passed

Allowed values: `pending`, `in_progress`, `repairing`, `passed`, `passed_with_issues`, `blocked`, `failed`.

Do not use `completed` or `done`.

## Goal

Support attaching existing authorized media to Dive Memories without making memory media proof.

## Scope

- Dive Memories repository/service media attachment behavior.
- Existing media ownership/authorization helpers.
- Handler request/response support for media IDs and ordering.
- Focused tests.

## Out Of Scope

- No upload pipeline changes unless existing media attach flow requires a narrow helper.
- No complex album editor.
- No Map/Journey/Passport integration.
- No web UI.

## Inputs

- Phase 3 CRUD APIs.
- Existing media ownership and profile media patterns.

## Tasks

- Validate media IDs are attachable by the author.
- Store memory media with stable sort order.
- Support replacing attachment list during update if within existing API contract.
- Prevent memory-media changes from mutating `user_dive_sites`.
- Add tests proving attached media is not proof and does not affect counts.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/dive_memories/...`
- `cd services/fphgo && go test ./internal/features/media/...`
- `git diff --check`

## Expected Evidence

- Unauthorized media cannot be attached.
- Attachment order is deterministic.
- Memory media does not unlock Dive Map locations or affect visited-site counts.

## Repair Policy

Allowed repairs: media ownership wiring, transaction behavior, tests.

Hard-stop if media ownership rules are ambiguous or would require broad media subsystem refactor.

## Completion Notes

Phase 4 passed on 2026-06-01. Added owned/active media authorization, request/response media ID support, deterministic attachment ordering through `dive_memory_media.sort_order`, hydrated memory read media IDs, and focused tests. Media attachment remains non-proof and does not mutate `user_dive_sites`.
