# User Dive Map Cross-Module Data Flow

## Proof Unlock Flow

1. User creates or updates a media post in `apps/web`.
2. Web sends the request through existing media API client patterns using shared contracts from `packages/types`.
3. `services/fphgo` receives the request in the media handler.
4. Handler validates request shape and auth context, then delegates to media service.
5. Media service enforces ownership, visibility, and qualifying proof rules.
6. Media repository writes `media_posts` with `dive_site_id` when provided and valid.
7. Dive Map derivation logic recomputes or upserts `user_dive_sites` for `(owner_user_id, dive_site_id)`.
8. `user_dive_sites` becomes the source for profile Dive Map markers and future visited-site stats.

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
3. Response may include:
   - the target user's qualifying media posts for that site
   - the target user's own Dive Memories for that site
   - shared/tagged memories for that site only when the target user has unlocked that site
4. Backend does not return shared/tagged memories as marker contents for locked sites.

## Dive Memories Flow

1. User creates a Dive Memory for a `dive_site_id`.
2. Backend stores `dive_memories` with `author_user_id`, `dive_site_id`, visibility, body/title, and timestamps.
3. Optional attachments are stored through `dive_memory_media`.
4. Optional tagged users are stored through `dive_memory_tagged_users`.
5. Tagged users may access the memory according to visibility rules.
6. No memory write creates, updates, or counts toward `user_dive_sites`.

## Sharing Rule Flow

Scenario: User A creates a memory at Dive Site X and tags User B.

1. Memory access checks may allow User B to see the shared memory.
2. Profile Dive Map marker list for User B still reads only from `user_dive_sites`.
3. If User B does not have a `user_dive_sites` row for Dive Site X, Dive Site X is absent from User B's Dive Map.
4. If User B later creates a qualifying owned media post tagged to Dive Site X, derivation creates `user_dive_sites`.
5. After unlock, the shared memory can appear inside User B's marker contents if visibility permits.

## Future Consumer Flow

Future Badge, Dive Journey, and Dive Passport work must consume `user_dive_sites` rather than re-deriving visited sites from memories, tagged users, or client-side counts.

Allowed integration point in this initiative:

- Stable service/repository read access to `user_dive_sites`.
- Explicit docs or tests showing visited-site count is based on `user_dive_sites`.

Forbidden in this initiative:

- Badge awarding logic.
- Dive Journey timelines.
- Dive Passport summaries.
- Manual count override behavior.
