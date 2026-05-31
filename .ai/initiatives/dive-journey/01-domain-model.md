# Dive Journey Domain Model

## Core Principle

Dive Journey is the user's social/storytelling timeline. It is downstream: it consumes memories, selected milestones, badges, map events, media activity, and manual user entries. It must not become a source of truth for Dive Map, badges, certifications, or Dive Passport stats.

Hard boundaries:

- Dive Map is the proof/location layer.
- Dive Journey is the story/timeline layer.
- Dive Passport is the public aggregate/showcase layer.
- Dive Journey may consume Dive Map milestones later, but must never unlock locations.
- Dive Journey may consume Profile Badges later, but must never verify badges.
- Dive Journey may feed Dive Passport display later, but Passport implementation is out of scope.
- Journey entries do not unlock Dive Map locations.
- Journey entries do not increase visited-site counts.
- Journey entries do not award badges.
- Journey entries do not verify credentials.
- Shared/tagged memories never unlock locations or inflate visited-site counts.

## `journey_entries`

Primary timeline entry model.

Fields:

- `id`
- `user_id`
- `type`: `memory | map_milestone | badge | event | media | custom`
- `title`
- `body`
- `dive_site_id` nullable
- `source_type` nullable
- `source_id` nullable
- `cover_media_id` nullable
- `visibility`: `public | followers | private`
- `occurred_at`
- `created_at`
- `updated_at`

Required behavior:

- Represents timeline content displayed on a user's Journey.
- Manual entries use type `custom` unless discovery identifies a better existing convention.
- Manual entries may omit `dive_site_id`, `source_type`, `source_id`, and media.
- Generated entries should use `source_type` and `source_id` for idempotency where appropriate.
- Generated entries must be safe to regenerate without creating duplicates.
- Journey entries may point at a dive site for context, but that does not unlock the site.
- Journey entries may point at media for storytelling, but that does not make the entry proof.
- Users should be able to hide/delete their own manual entries.
- For generated entries, prefer hide/archive over destructive deletion unless product convention says otherwise.

## `journey_entry_media`

Optional media attachments for timeline entries.

Fields:

- `id`
- `journey_entry_id`
- `media_id`
- `sort_order`

Required behavior:

- Attaches existing media assets to a Journey entry.
- Does not turn the attached media into Dive Map proof.
- Does not create or update `user_dive_sites`.

## `journey_entry_tagged_users`

Optional tagged users for social timeline entries.

Fields:

- `id`
- `journey_entry_id`
- `tagged_user_id`
- `status`

Required behavior:

- Supports tagging buddies/divers when V1 implementation confirms the existing user lookup and privacy model are safe.
- Tagged users may be able to see entries according to visibility and authorization rules.
- Tagging does not unlock Dive Map locations.
- Tagging does not increase visited-site counts.
- Tagging does not award badges or verify credentials.

## Journey Sources

### Dive Memories

Primary source.

- User-created social/contextual memories.
- May be attached to a `dive_site_id`.
- May include photos/videos.
- May tag buddies/divers.
- Does not prove site ownership.

### Manual Journey Entries

User-created standalone timeline entries.

- May have no media.
- May have no dive site.
- Example: "First time seeing a turtle."
- These are social memories, not verified achievements.

### Dive Map Milestones

Future generated entries.

- Examples: first dive site, visited Apo Island, 5 dive sites.
- Generated only from `user_dive_sites`, not from shared/tagged memories.
- This initiative may prepare integration points, but must not implement Dive Map if it is not already implemented.
- Journey consumes map milestones; it never creates map ownership.

## Visibility Model

Planned visibility values:

- `public`
- `followers`
- `private`

Execution rule:

- If an existing follower system is available, `followers` visibility must use that system.
- If a follower system is not available, Phase 1 must hard-stop for a product decision or document a product-approved fallback before schema/API implementation.
- Do not silently treat `followers` as `public` or `private`.

### Badges

Future generated entries from badge additions/earnings.

- Verification is not required for Journey display.
- This initiative must not implement badge system changes unless explicitly required by the Journey surface.

### Events / Courses / Media Activity

Future or optional generated entries.

- Only meaningful milestones should be included.
- Noisy actions must not become Journey entries, including likes, caption edits, follows, or generic profile edits.

## Deferred Concepts

- Dive Map implementation.
- Dive Passport implementation.
- Badge verification.
- Formal certification verification.
- Full event/course integration.
- Tagged-user notifications.
- Ranking/recommendation feed.
- Mobile implementation.
