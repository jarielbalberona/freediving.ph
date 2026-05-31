# Known Risks

- Autonomous execution can amplify vague specifications. Every phase must define scope, verification, and hard stops clearly.
- The runner can invoke Codex, but it cannot guarantee good judgment. Skills and phase files must constrain behavior.
- Generated reports are useful only if verification evidence is concrete. Avoid optimistic summaries without command output.
- Repo state may contain unrelated dirty changes. Agents must inspect and preserve them.
- Product areas involving safety, verification, authentication, privacy, payments, or destructive data changes require conservative hard-stop behavior.

## Initiative Risks

### `user-dive-map`

- Existing `media_posts` may not support `dive_site_id` without careful additive migration.
- Media ownership, visibility, and qualifying-proof rules must be confirmed before implementation.
- Shared/tagged Dive Memories must remain social/contextual; treating them as visit proof would corrupt Dive Map counts and downstream badge/journey/passport inputs.
- Dive Memories V1 scope must be confirmed in Phase 1 before backend or UI memory work starts.
- Dive Journey and Dive Passport are future downstream consumers only and must not be implemented during this initiative.

### `dive-journey`

- Journey must remain downstream; using it as source of truth for Dive Map, badges, certifications, credentials, or Passport stats would corrupt the product model.
- `followers` visibility may require a product decision if the follower system is unavailable or insufficient.
- Generated entries require careful `source_type`/`source_id` idempotency to prevent duplicate timeline entries during regeneration.
- Manual and generated entry hide/delete/archive semantics must be confirmed from existing conventions before implementation.
- Shared/tagged memories must not unlock locations or inflate visited-site counts through Journey.

### `dive-passport`

- Passport must remain a read-only aggregate/presentation layer; creating a `dive_passports` source-of-truth table or duplicating child source data would corrupt ownership boundaries.
- Child visibility rules across Profile, Dive Map, Profile Badges, Dive Journey, media, and memories must be confirmed before aggregate reads.
- Optional `passport_settings` must remain presentation-only and must not mutate child visibility, stats, badges, Journey entries, or Dive Map locations.
- Empty states must be explicit for missing Dive Map, empty Journey, no badges, no memories/media, and new user profiles.
- Dependencies must stay one-way into Passport; Passport must not feed or mutate Map, Journey, Badges, certifications, media, memories, or stats.
