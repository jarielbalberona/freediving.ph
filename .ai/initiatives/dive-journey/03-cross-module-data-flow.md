# Dive Journey Cross-Module Data Flow

## Manual Entry Flow

1. Authenticated user creates or updates a manual Journey entry in `apps/web`.
2. Web sends the request through existing API client patterns using shared contracts from `packages/types`.
3. `services/fphgo` receives the request in a Journey handler.
4. Handler validates request shape and auth context, then delegates to Journey service.
5. Journey service enforces ownership, visibility, and manual-entry rules.
6. Journey repository writes `journey_entries` with type `custom` or the locally approved manual type.
7. Optional media and tagged users are written through Journey attachment/tagging tables only when V1 support is approved.
8. No Journey write creates, updates, or counts toward `user_dive_sites`, badges, certifications, or Passport stats.

## Profile Journey Read Flow

1. Web profile route requests a user's Journey timeline.
2. Shared request/response contracts live in `packages/types/src/api`.
3. Backend Journey or profile handler resolves viewer identity and target profile identity.
4. Service queries `journey_entries` visible to the viewer.
5. Service joins or batches display metadata for media, dive sites, and tagged users only where needed and authorized.
6. Response returns timeline entries and display metadata.
7. Web renders Journey as a social/storytelling timeline without calculating proof, badges, credentials, or Passport stats.

## Media Attachment Flow

1. User attaches existing media to a Journey entry.
2. Backend validates that the user can use the media according to existing media ownership/visibility rules.
3. Repository writes `journey_entry_media` rows with deterministic `sort_order`.
4. Attachment does not make the Journey entry proof.
5. Attachment does not unlock Dive Map locations or increase visited-site counts.

## Tagged User Flow

1. User tags another diver/buddy on a Journey entry.
2. Backend validates the tagged user and privacy model if V1 support is approved.
3. Repository writes `journey_entry_tagged_users`.
4. Tagged user access follows visibility and authorization rules.
5. Tagging does not unlock locations, award badges, verify credentials, or modify Passport stats.

## Generated Entry Flow

1. Future systems such as Dive Map, Badges, events/courses, or media milestones identify a meaningful milestone.
2. They call a Journey integration point with `source_type`, `source_id`, `user_id`, type, title/body, and occurrence time.
3. Journey service writes or updates the generated entry idempotently by `source_type` and `source_id` where appropriate.
4. Re-running the same source event must update or no-op the existing entry rather than create duplicates.
5. Generated entries are display artifacts only.
6. Generated entries do not become source-of-truth records for upstream systems.

## Dive Map Boundary

Dive Map remains the proof/location layer. Journey may later display milestones derived from `user_dive_sites`, but Journey entries must never create `user_dive_sites`, unlock sites, or increase Dive Map visited counts.

Shared/tagged memories never unlock locations and must not generate Dive Map ownership through Journey.

## Badge Boundary

Badges remain their own domain. Journey may display badge-related entries later, but Journey must never award, verify, revoke, or recalculate badges.

## Passport Boundary

Dive Passport is a future aggregate/showcase layer. Journey may feed Passport display later through read-only timeline data, but Passport implementation and stats aggregation are out of scope.
