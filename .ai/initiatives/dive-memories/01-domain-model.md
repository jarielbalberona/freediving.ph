# Dive Memories Domain Model

## Core Concepts

### Dive Memory

A Dive Memory is a social/contextual record of a dive experience. It may refer to a dive site, include media, and tag other users. It is not visit proof.

V1 rule: map-attached Dive Memories require `dive_site_id`. Standalone non-site social notes remain Dive Journey entries.

Proposed fields:

- `id`
- `author_user_id`
- `dive_site_id`
- `title`
- `body`
- `visibility`: `public`, `followers`, `tagged`, `private`
- `occurred_at`
- `created_at`
- `updated_at`
- `deleted_at`

### Dive Memory Media

A join record linking existing media to a Dive Memory.

Proposed fields:

- `id`
- `memory_id`
- `media_id`
- `sort_order`

Rules:

- Media attachment does not make the memory proof.
- Media must be author-owned or otherwise authorized through existing media rules.
- Attaching/removing memory media must not affect `user_dive_sites`.

### Dive Memory Tagged User

A tag association between a memory and another user.

Proposed fields:

- `id`
- `memory_id`
- `tagged_user_id`
- `status`: `pending`, `accepted`, `declined`, `hidden`
- `created_at`
- `updated_at`

Rules:

- New tags default to `pending`.
- Pending tags may be visible to the tagged user in their own management surface.
- Pending tags must not be publicly presented as accepted participation.
- Accepted tags may appear according to visibility and blocking rules.
- Declined/hidden tags suppress tagged-user association from public/tagged display.
- Blocked users cannot be tagged and cannot access a memory through a tag.

## Visibility Model

### `public`

Visible according to existing public profile/content rules.

### `followers`

Visible only to allowed relationship viewers if the existing follower/saved-user model is technically ready and accepted for this purpose.

Hard-stop if a phase requires follower visibility but the available relationship model is ambiguous or insufficient. V1 may support only `public`, `tagged`, and `private` if follower visibility cannot be implemented cleanly.

### `tagged`

Visible to the author and allowed tagged users only. Tagged-user access requires:

- the viewer is tagged,
- the viewer is not blocked by the author,
- the tag is not declined or hidden,
- the memory visibility allows tagged access.

### `private`

Visible only to the author.

## Source-Of-Truth Boundaries

- Dive Map owns visited-site proof through `user_dive_sites`.
- Dive Memories never create, update, delete, or backfill `user_dive_sites`.
- Dive Memories never increase visited-site counts.
- Profile Badges own achievements/credentials/stats and must not award directly from memories in V1.
- Dive Journey owns storytelling display. Memory-backed Journey entries are downstream/social only.
- Dive Passport owns aggregate presentation and must not compute proof or counts from memories.

## Map Display Eligibility

A memory may appear inside a Dive Map marker only when both are true:

- the marker owner has already unlocked the same `dive_site_id` through `user_dive_sites`, and
- the memory is visible to the current viewer under memory visibility/tag/blocking rules.

Author-owned memory display:

- The author's memory may appear inside the author's marker only if the author has `user_dive_sites` for the same site.

Tagged/shared memory display:

- A tagged user's marker may include the tagged/shared memory only if the tagged user has `user_dive_sites` for the same site and tag status/visibility allows display.

No memory display path may unlock the marker.

## Blocking Rules

Implementation must use existing blocking semantics where available.

Hard-stop if:

- the repository cannot determine whether the author blocked the tagged user,
- blocked users can still be tagged,
- blocked users can access memory content through tag or profile reads,
- blocking policy differs across Map/Journey/Passport and no locked rule resolves it.

## V1 Product Decision Captured

Dive Memories are site-attached social/contextual objects in V1. Non-site standalone storytelling remains Dive Journey, not Dive Memories.
