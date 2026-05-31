# Dive Memories Module Sequence

Execute phases in numeric order. Do not skip a phase unless the phase file explicitly marks it not applicable or already passed.

## Phase 1: Discovery And Privacy Contract Alignment

Confirm existing profile, media, blocking, follower/saved-user, Dive Map, Journey, Passport, and Badge boundaries before code work. Decide whether follower visibility is technically available for V1.

Hard-stop on privacy/tagging ambiguity.

## Phase 2: Backend Schema/Domain Foundation

Add non-destructive schema for `dive_memories`, `dive_memory_media`, and `dive_memory_tagged_users`, sqlc queries, and DB-only repository boundaries.

Do not wire behavior into Map/Journey/Passport yet.

## Phase 3: Memory CRUD APIs And Authorization

Implement authenticated memory create/update/delete and profile/own read foundations with author-only write rules, visibility filters, and soft deletion.

Do not implement tagging yet.

## Phase 4: Media Attachment Support

Implement memory-media attachment and ordering rules using existing media ownership/authorization behavior.

Do not let memory media qualify as map proof.

## Phase 5: Tagged-User Policy And APIs

Implement tag add/remove/accept/decline/hide behavior, pending-by-default tags, blocking checks, and tagged access controls.

Hard-stop if blocking or tag display policy is ambiguous.

## Phase 6: Shared TypeScript Contracts

Add shared request/response DTOs for memories, memory media, tags, visibility, tag status, and API responses under `packages/types/src`.

Keep web/backend contracts aligned.

## Phase 7: Dive Map Marker Integration

Expose eligible memories in map marker detail reads without unlocking locations or inflating counts.

Eligibility must require `user_dive_sites` for the marker owner and matching memory `dive_site_id`.

## Phase 8: Dive Journey And Passport Integration

Expose/create Journey display entries for memories and add Passport recent visible memories without making either module authoritative for proof, counts, badges, or credentials.

## Phase 9: Web UI And Management Surfaces

Add web surfaces for creating, viewing, and managing Dive Memories if feasible. Include tagged-memory management or a safe fallback that does not publicly present pending/declined/hidden tags incorrectly.

## Phase 10: Final Verification/Reporting

Run full targeted verification, document deferred work, update state files, and write final report.

## Dependency Notes

- `user-dive-map` must remain complete because Map marker integration depends on `user_dive_sites`.
- `dive-journey` must remain complete because memory display may feed Journey as downstream storytelling.
- `dive-passport` must remain complete because Passport may show recent visible memories.
- `profile-experience-integration` must remain complete because it defines cross-module source-of-truth boundaries.

## Sequencing Rule

Do not implement Map/Journey/Passport integration before core memory authorization and tagged-user policy are verified. The privacy model is the dangerous part. Treat UI as downstream.
