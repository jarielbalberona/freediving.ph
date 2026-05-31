# User Dive Map Cross-Module Data Flow

## Proof Unlock Flow

1. User creates or updates a media post in `apps/web`.
2. Web sends the request through existing media API client patterns using shared contracts from `packages/types`.
3. `services/fphgo` receives the request in the media handler.
4. Handler validates request shape and auth context, then delegates to media service.
5. Media service enforces ownership, lifecycle, and qualifying proof rules.
6. Media repository writes `media_posts` with `dive_site_id` when provided and valid.
7. Dive Map derivation logic recomputes or upserts `user_dive_sites` for `(owner_user_id, dive_site_id)`.
8. `user_dive_sites` becomes the source for profile Dive Map markers, marker counts, and future visited-site stats.

## Dive Map Read Flow

1. Web profile route requests a user's Dive Map summary.
2. Shared request/response contracts live in `packages/types/src/api`.
3. Backend profile or Dive Map handler resolves viewer identity and target profile identity.
4. Service queries `user_dive_sites` for unlocked markers visible to the viewer.
5. Service joins or batches dive site display data from the existing dive site/explore source.
6. Response returns marker list, visited-site count derived from `user_dive_sites`, and minimal display metadata.
7. Web renders the profile Dive Map section without calculating ownership or unlock rules client-side.

## Dive Site Marker Detail Flow

1. Web requests marker detail for a target user and `dive_site_id`.
2. Backend verifies the target user has a `user_dive_sites` row for the site before returning marker contents.
3. Response includes the target user's own qualifying media posts for that site.
4. Backend does not return own memories, shared memories, tagged memories, or memory-derived content in V1 marker details.
5. Backend does not return marker detail for locked sites.

## Dive Memories Deferred Flow

Dive Memories are not part of User Dive Map V1.

Deferred from this initiative:

- memory creation/edit/delete
- `dive_memories`
- `dive_memory_media`
- `dive_memory_tagged_users`
- tagged-user access
- tag acceptance/decline
- blocking behavior for memory tags
- shared-memory visibility
- showing shared/tagged memories inside map markers

Future Dive Memories must be implemented in a separate locked initiative before memory content can be integrated into map markers.

## Future Consumer Flow

Future Profile Badges, Dive Journey, and Dive Passport work must consume `user_dive_sites` rather than re-deriving visited sites from memories, tagged users, Journey entries, Passport state, or client-side counts.

Allowed integration point in this initiative:

- Stable service/repository read access to `user_dive_sites`.
- Explicit docs or tests showing visited-site count is based on `user_dive_sites`.

Forbidden in this initiative:

- Badge awarding logic.
- Dive Journey timelines.
- Dive Passport summaries.
- Manual count override behavior.
- Memory-driven marker contents.
