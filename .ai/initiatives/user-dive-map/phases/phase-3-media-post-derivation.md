# Phase 3: Media Post To User Dive Sites Derivation

Status: pending

## Objective

Make media posts the only source that can create, update, or remove unlocked Dive Map markers.

## Goal

Maintain `user_dive_sites` from qualifying user-owned `media_posts` tagged to `dive_site_id`.

## Scope

- `services/fphgo/internal/features/media`
- Selected Dive Map repository/service package from Phase 1.
- sqlc queries and generated code for derivation.
- Go tests for media proof derivation.

## Out Of Scope

- No web UI changes.
- No Dive Memories implementation.
- No badge, Dive Journey, or Dive Passport implementation.
- No client-side visited count calculation.

## Non-Goals

- Do not derive visits from memories, tagged users, comments, likes, feed items, reviews, or manual inputs.
- Do not implement map read endpoints unless Phase 4 is active.

## Inputs

- Phase 1 report.
- Phase 2 schema and generated sqlc output.
- `01-domain-model.md`
- Existing media service and repository behavior.

## Tasks

- Define the service-level rule for a qualifying media post using only product-approved fields discovered in Phase 1.
- On media post create/update/delete or equivalent lifecycle events, recompute or upsert `user_dive_sites` for affected `(user_id, dive_site_id)`.
- Ensure `first_post_id`, `first_visited_at`, `last_post_id`, `last_visited_at`, and `media_post_count` are deterministic.
- Ensure untagging, deleting, or making the final qualifying proof ineligible removes or updates the marker.
- Keep handlers thin and place derivation behavior in services.
- Add service tests around create, update, delete, re-tag, untag, and multiple posts.

## Implementation Notes

- Prefer deterministic recompute for a user/site pair over fragile incremental math unless existing patterns strongly favor incremental updates.
- Derivation must be idempotent.
- User-owned means the media post owner, not tagged users or viewers.

## Verification Requirements

- Tests must fail if non-owned or shared/tagged content unlocks a marker.
- Tests must cover create, update, delete, retag, untag, and multiple qualifying posts.

## Verification Commands

- `cd services/fphgo && go test ./internal/features/media/...`
- `cd services/fphgo && go test ./internal/features/dive_map/...` if a Dive Map package exists.
- `cd services/fphgo && go test ./internal/features/profiles/...` if profile services read the new model in this phase.
- `cd services/fphgo && make sqlc`
- `git diff --check`

## Expected Evidence

- Tests prove one qualifying owned media post unlocks one site for that owner.
- Tests prove another user's post does not unlock the viewer's site.
- Tests prove multiple posts update counts and first/last fields correctly.
- Tests prove removing the last qualifying post removes or recomputes the marker.
- No memory/tagged-user logic affects `user_dive_sites`.

## Repair Policy

Allowed repairs:

- Go compile failures
- sqlc generated drift
- service test failures inside media/Dive Map derivation
- missing imports
- formatting issues

Hard-stop if qualifying proof rules are ambiguous, media ownership is ambiguous, media lifecycle hooks cannot be updated without unsafe side effects, or existing media schema cannot preserve current behavior.

## Stop Conditions

- Qualifying proof cannot be defined from existing approved fields.
- Media lifecycle behavior cannot be hooked safely.
- Existing media service behavior would be broken by derivation.

## Expected Report Output

- Derivation rule used.
- Code paths that trigger recompute/upsert.
- Tests proving ownership-only unlock behavior.
- Tests proving no memory/tagged-user effect.

## Completion Notes

Filled by the execution skill or runner.
