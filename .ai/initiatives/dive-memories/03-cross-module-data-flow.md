# Dive Memories Cross-Module Data Flow

## Write Flow

1. Authenticated user creates a Dive Memory with `dive_site_id`, title/body, visibility, occurrence time, optional media IDs, and optional tagged users.
2. Backend service validates author identity, dive site existence, visibility policy, media ownership/authorization, blocking constraints, and tag targets.
3. Repository writes `dive_memories`, `dive_memory_media`, and pending `dive_memory_tagged_users` rows in a transaction where needed.
4. No write path mutates `user_dive_sites`, Profile Badges, Journey source truth, Passport source data, credentials, certifications, or source stats.

## Read Flow

### Own Memories

Authenticated owner reads their own memories, including pending/accepted/declined/hidden tag state as appropriate for management.

### Profile-Visible Memories

Profile memory reads filter by:

- author/profile owner,
- viewer identity,
- memory visibility,
- tag status where tagged access is relevant,
- blocking rules,
- deleted state.

### Tagged Memory Management

Tagged users can see pending tag invitations in a management surface if allowed by blocking rules. Pending tags are not public accepted participation.

### Site-Visible Memories

Site or marker reads must filter memories by site, visibility, tag status, blocking, and map eligibility. Site attachment does not create proof.

## Dive Map Integration

Memory display in map marker details is downstream from `user_dive_sites`.

Author marker:

1. Dive Map loads marker from `user_dive_sites`.
2. Memory query may include author memories for the marker `dive_site_id`.
3. Memory appears only if visible to viewer.

Tagged user marker:

1. Dive Map loads tagged user's marker from `user_dive_sites`.
2. Memory query may include memories for the same `dive_site_id` where tagged user tag status/visibility allows display.
3. Memory appears only if the tagged user has unlocked the same site.

Forbidden:

- memory creates marker,
- memory increases marker count,
- memory changes first/last proof post,
- memory changes `visitedSiteCount`.

## Dive Journey Integration

Creating or exposing a Dive Memory may create or display a Journey entry with source type `memory`.

Rules:

- Journey entry is storytelling-only.
- Journey must not treat memory as map proof.
- Journey must not increase visited-site counts.
- Journey must not award badges or verify credentials.
- Generated Journey entries must remain idempotent by source identity where used.

## Dive Passport Integration

Passport may show recent visible memories and memory count/state as aggregate presentation.

Rules:

- Passport must read memories through a memory-owned visibility boundary.
- Passport must not compute `visitedSiteCount` from memories.
- Passport must not copy memory rows into a Passport-owned source table.
- Passport settings may hide presentation sections but must not mutate memory visibility or tags.

## Profile Badges Integration

V1 memories do not award badges directly.

Future badge producers must use explicit milestone rules and authoritative source data, such as `user_dive_sites`, not memory tags.

## Shared Contracts

Shared DTOs belong in `packages/types/src`, likely a new `api/dive-memories.ts` export.

The web app must consume shared contracts through feature API clients/hooks, not duplicate API shapes in feature-local runtime contracts.

## Privacy Failure Modes To Test

- Tagged user can see a pending tag in their management surface but is not publicly shown as an accepted participant.
- Declined/hidden tags do not appear publicly.
- Blocked users cannot be tagged.
- Blocked users cannot access memories through tag reads.
- Follower visibility is either correctly implemented through existing relationship rules or deferred/hard-stopped.
- Tagged/shared memory does not appear in a tagged user's map marker unless that user has `user_dive_sites` for the same site.
