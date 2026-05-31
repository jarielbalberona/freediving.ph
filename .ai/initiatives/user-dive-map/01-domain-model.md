# User Dive Map Domain Model

## Core Principle

User Dive Map is proof-based. A user unlocks or owns a Dive Map location only when that user personally owns at least one qualifying media post tagged to that dive site.

Hard boundaries:

- Tagged/shared memories must not independently unlock a Dive Map location.
- Tagged/shared memories must not inflate visited-site counts.
- Dive Map is proof-based.
- Dive Memories are social/contextual.
- Dive Passport later aggregates Dive Map, Badges, Journey, certifications, PBs, and stats, but is not implemented here.
- Dive Journey later consumes selected events, memories, and milestones, but is not implemented here.

## `media_posts`

Existing or extended source of truth for proof.

Required behavior:

- Must support `dive_site_id`.
- A qualifying media post must be owned by the user.
- A qualifying media post must be tagged to a valid dive site.
- A qualifying media post unlocks the matching site for the owner only.
- A media post owned by User A must not unlock a site for tagged users, mentioned users, buddies, group members, or viewers.

Open discovery item:

- Future execution must identify the existing ownership, visibility, and lifecycle fields for `media_posts` before designing the migration and derivation logic.

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
- Shared/tagged memories do not affect this table.
- Future source for "Dive Sites Visited" auto stat.
- Future input for map-based badges, Dive Journey milestones, and Dive Passport summary.

## `dive_memories`

Social/contextual trip memories attached to a dive site.

Fields:

- `id`
- `author_user_id`
- `dive_site_id`
- `title`
- `body`
- `visibility`
- `occurred_at`
- `created_at`
- `updated_at`

Purpose:

- Allows a user to create memories or activities for a specific dive site.
- May include dive trip activities, food, group photos, notes, non-dive trip moments, or other contextual memories.
- Does not count as proof of visiting.
- Does not create or update `user_dive_sites`.

## `dive_memory_media`

Optional media attachments for Dive Memories.

Fields:

- `memory_id`
- `media_id`
- `sort_order`

Required behavior:

- Links existing media assets to memories.
- Does not make the linked media proof unless that media is also a qualifying user-owned `media_posts` record tagged to the dive site under the media proof rules.

## `dive_memory_tagged_users`

Tagged buddies or dive group members in a memory.

Fields:

- `memory_id`
- `tagged_user_id`
- `status`

Required behavior:

- Supports tagging buddies or dive group members in a memory.
- Tagged users can access shared/tagged memories according to visibility rules.
- A tagged memory appears inside a tagged user's Dive Map marker only when that tagged user already has `user_dive_sites` for the same `dive_site_id`.
- A tagged memory never unlocks the site for the tagged user.

## Sharing Rule

If User A creates a memory at Dive Site X and tags User B:

- User B may see/access the shared memory according to visibility and authorization rules.
- Dive Site X must not appear on User B's Dive Map unless User B also has a qualifying user-owned media post tagged to Dive Site X.
- The shared memory appears inside User B's Dive Map marker only if User B has already unlocked Dive Site X through `user_dive_sites`.

## Marker Contents Rule

A user's Dive Map marker may include:

- the user's own qualifying media posts for that dive site
- the user's own memories for that dive site
- shared/tagged memories for that dive site only when the user has unlocked that dive site

## Deferred Concepts

- favorites
- want-to-visit
- manual visit count
- region grouping
- advanced map filters
- badges such as first dive site, 5 dive sites, Apo Island visitor, Dauin explorer, Visayas explorer
- Dive Journey implementation
- Dive Passport implementation
- formal verification system
