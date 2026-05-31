# Known Risks

- Autonomous execution can amplify vague specifications. Every phase must define scope, verification, and hard stops clearly.
- The runner can invoke Codex, but it cannot guarantee good judgment. Skills and phase files must constrain behavior.
- Generated reports are useful only if verification evidence is concrete. Avoid optimistic summaries without command output.
- Repo state may contain unrelated dirty changes. Agents must inspect and preserve them.
- Product areas involving safety, verification, authentication, privacy, payments, or destructive data changes require conservative hard-stop behavior.

## Initiative Risks

### `user-dive-map`

- Existing `media_posts` already has nullable `dive_site_id`, but `user_dive_sites` is not yet implemented as the required proof-based read model.
- Media ownership and basic qualifying-proof fields are identifiable through `media_posts.author_app_user_id`, `media_posts.dive_site_id`, media object ownership checks, deleted-state fields, and approved `dive_sites`.
- Shared/tagged Dive Memories must remain social/contextual; treating them as visit proof would corrupt Dive Map counts and downstream badge/journey/passport inputs.
- Dive Memories and tagged-user sharing are deferred from User Dive Map V1. Future memory integration remains blocked until a separate locked `dive-memories` privacy/tagging specification defines ownership, tagging, acceptance/decline, blocking, visibility, and authorization.
- V1 marker details must show only the user's own qualifying media posts; adding memory content during User Dive Map execution would be scope creep.
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

### `profile-experience-integration`

- Integration hardening must not blur source ownership: Profile Badges own achievements/credentials/stats, Dive Map owns proof/location, Dive Journey owns storytelling timeline, and Dive Passport owns presentation aggregation only.
- Dive Sites Visited must align with `user_dive_sites`; transitional or fallback counting must not count memories, Journey entries, Passport state, or shared/tagged content.
- Badge-origin Journey entries must remain display-only and idempotent; Journey must not award, verify, revoke, or mutate badges.
- Passport must remain read-only and must not duplicate source data while composing profile, badges, map, journey, memories, media, and stats.
- Public profile UX can easily become redundant or contradictory if standalone module sections and Passport summaries are not deliberately composed.
