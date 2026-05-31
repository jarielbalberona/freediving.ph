# Dive Journey Final Report

## Initiative Summary

Dive Journey is implemented as the downstream social/storytelling timeline for profiles.

Implemented scope:

- `journey_entries` and `journey_entry_media` schema.
- Profile Journey read API: `GET /v1/profiles/{username}/journey`.
- Manual owner write APIs: create, update, soft delete.
- Owner-only media attachment support.
- Generated-entry upsert integration helpers with source idempotency.
- Generated-entry hide/archive helper.
- Shared TypeScript contracts.
- Profile web Journey section in the Diving tab.
- Read-only future Passport integration documentation.

Not implemented by design:

- Tagged-user Journey behavior.
- Dive Memories.
- Upstream milestone producers.
- Badge awarding/verification.
- Dive Map unlocking/counting from Journey.
- Passport aggregate implementation or stats.
- Mobile UI.

## Completed Phases

- Phase 1: Discovery and Contract Alignment - passed.
- Phase 2: Backend Schema Foundation - passed.
- Phase 3: Journey Read/Write APIs and Authorization - passed.
- Phase 4: Media and Tagging Support - passed with issues; owner media attachments were implemented, tagged-user support was deferred.
- Phase 5: Shared TypeScript Contracts - passed.
- Phase 6: Web Profile Journey UI - passed.
- Phase 7: Generated-Entry Integration Preparation - passed.
- Phase 8: Visibility/Hide/Delete Hardening - passed.
- Phase 9: Passport Integration Preparation Only - passed.
- Phase 10: Final Verification/Reporting - passed.

## Verification Results

- `cd services/fphgo && go test ./db/...`: passed.
- `cd services/fphgo && make sqlc`: passed.
- `cd services/fphgo && go test ./...`: passed.
- `pnpm --filter @freediving.ph/types type-check`: passed.
- `pnpm --filter @freediving.ph/types test`: passed, 37 tests.
- `pnpm --filter @freediving.ph/web type-check`: passed.
- `pnpm --filter @freediving.ph/web test`: passed, 205 tests, 14 skipped.
- `pnpm --filter @freediving.ph/web lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed.
- `pnpm build`: passed.
- `git diff --stat`: reviewed.
- `git diff --check`: passed.

## Risks

- Tagged-user Journey support is still deferred because the repository has no locked privacy/tagging model for tag acceptance, blocking, or tagged-user access.
- Profile Journey UI exposes create/delete only. Manual edit UI and media attachment picker UI are not exposed yet.
- Generated-entry producers do not exist yet. Future producers must remain authoritative and call Journey only for downstream display rows.
- Journey entries with `dive_site_id` are storytelling context only and must not unlock Dive Map locations or inflate visited-site counts.

## Known Limitations

- No mobile Journey UI.
- No public generated-entry write API.
- No tagged-user backend table or UI.
- No Journey-derived Passport stats.
- No app runtime/browser smoke test was run, per autonomous execution constraints.

## Recommended Follow-Up Work

- Author a separate locked `dive-memories` or Journey tagging/privacy initiative before adding tagged-user memories or shared-memory visibility to Journey.
- Add manual Journey edit and media picker UI in a scoped UI hardening initiative.
- When Badge, Dive Map, event/course, or media milestone producers are specified, wire them into `UpsertGeneratedEntry` without making Journey authoritative.
- In the Passport initiative, consume Journey through `ListProfileJourney`/`GET /v1/profiles/{username}/journey` as read-only display data.

## Final Verdict

PASS WITH ISSUES

The implemented Journey scope passes verification. The issue is deliberate and documented: tagged-user support remains out of scope until a separate locked privacy/tagging specification exists.
