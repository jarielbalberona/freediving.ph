# User Dive Map Domain Model

## Core Principle

User Dive Map is proof-based. A user unlocks or owns a Dive Map location only when that user personally owns at least one qualifying media post tagged to that dive site.

Hard boundaries:

- A dive site is unlocked only by a qualifying user-owned media post tagged to `dive_site_id`.
- Tagged/shared memories must not independently unlock a Dive Map location.
- Tagged/shared memories must not inflate visited-site counts.
- Dive Map is proof-based.
- Dive Memories are deferred from User Dive Map V1.
- Dive Passport later aggregates Dive Map, Badges, Journey, certifications, PBs, and stats, but is not implemented here.
- Dive Journey later consumes selected events and milestones, but is not implemented here.

## `media_posts`

Existing or extended source of truth for proof.

Required behavior:

- Must support `dive_site_id`.
- A qualifying media post must be owned by the user.
- A qualifying media post must be tagged to a valid dive site.
- A qualifying media post unlocks the matching site for the owner only.
- A media post owned by User A must not unlock a site for mentioned users, buddies, group members, viewers, or any future tagged-memory participant.
- Deleted, hidden, rejected, inactive, or otherwise disqualified media must not keep a marker unlocked.

Execution note:

- Phase 1 previously confirmed the repo has identifiable media ownership and nullable `media_posts.dive_site_id`. Execution must re-run discovery because the initiative has been relocked and the worktree may have changed.

## `user_dive_sites`

Derived/materialized read model representing one unlocked Dive Map marker for one user at one dive site.

Fields:

- `user_id`
- `dive_site_id`
- `first_post_id`
- `first_visited_at`
- `last_post_id`
- `last_visited_at`
- `media_post_count`
- `visibility`

Required behavior:

- Derived only from qualifying user-owned `media_posts` tagged to `dive_site_id`.
- One logical row per `(user_id, dive_site_id)`.
- `first_post_id` and `first_visited_at` identify earliest qualifying proof.
- `last_post_id` and `last_visited_at` identify latest qualifying proof.
- `media_post_count` counts qualifying proof posts for that user and site only.
- Memories, tagged users, comments, likes, feed items, reviews, manual inputs, and client-side counts do not affect this table.
- Source for "Dive Sites Visited" auto stat.
- Future input for map-based badges, Dive Journey milestones, and Dive Passport summary.

## Marker Summary

Profile-facing list of unlocked dive sites.

Required behavior:

- Reads only from `user_dive_sites`.
- Joins dive-site display fields from the canonical dive-site/explore source.
- Includes visited-site count derived from `user_dive_sites`.
- Does not include manually entered site counts.

## Marker Detail

Profile-facing detail for one unlocked dive site.

Required behavior:

- Backend must first prove the target user has a `user_dive_sites` row for the requested `dive_site_id`.
- V1 detail includes only the target user's own qualifying media posts for that site.
- V1 detail must not include own memories, shared memories, tagged memories, or memory-derived content.
- Locked sites must not expose marker detail.

## Deferred Domain Concepts

The following are explicitly out of User Dive Map V1:

- `dive_memories`
- `dive_memory_media`
- `dive_memory_tagged_users`
- memory creation/edit/delete
- tagged-user access
- tag acceptance/decline
- blocking behavior for memory tags
- shared-memory visibility
- showing shared/tagged memories inside map markers

Future Dive Memories must be implemented in a separate initiative with a locked privacy/tagging specification before memory content can be integrated into map markers.

## Deferred Product Concepts

- favorites
- want-to-visit
- manual visit count
- region grouping
- advanced map filters
- badges such as first dive site, 5 dive sites, Apo Island visitor, Dauin explorer, Visayas explorer
- Dive Journey implementation
- Dive Passport implementation
- formal verification system
