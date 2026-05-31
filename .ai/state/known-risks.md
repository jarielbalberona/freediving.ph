# Known Risks

- Autonomous execution can amplify vague specifications. Every phase must define scope, verification, and hard stops clearly.
- The runner can invoke Codex, but it cannot guarantee good judgment. Skills and phase files must constrain behavior.
- Generated reports are useful only if verification evidence is concrete. Avoid optimistic summaries without command output.
- Repo state may contain unrelated dirty changes. Agents must inspect and preserve them.
- Product areas involving safety, verification, authentication, privacy, payments, or destructive data changes require conservative hard-stop behavior.

## Initiative Risks

### `user-dive-map`

- Existing `media_posts` already has nullable `dive_site_id`, and Phase 2 added `user_dive_sites` as the required proof-based read model.
- Phase 2 added the `services/fphgo/internal/features/dive_map` sqlc query package foundation so derivation/read behavior does not get buried in media or profile services.
- `user_dive_sites` derivation is implemented for profile media post creation and ready tagged Moment completion. Existing repository behavior can recompute delete/retag/untag states, but no profile media post edit/delete endpoint exists yet; future lifecycle work must call recompute for affected old/new user-site pairs.
- `user_dive_sites.first_post_id` and `last_post_id` use `ON DELETE RESTRICT`; media lifecycle code must recompute/remove rows before any future hard deletion of proof posts.
- Moment upload intents do not unlock sites until the Moment media item is active, ready, approved, and still tagged to the same dive site as the owning media post.
- Profile Dive Map read APIs now use existing profile visibility semantics: `public` anonymous-visible, `members` signed-in visible, and `private` self-only. If product later wants different map-specific privacy semantics, that needs a separate locked decision.
- The profile repository still contains a transitional media-post fallback for visited-site counts if `user_dive_sites` is absent; migrated environments use `user_dive_sites`.
- Phase 5 implemented the V1 map as a dense profile section/list with selected-site proof detail, not a full geographic map canvas. This is deliberate until a map-provider UX/runtime requirement is locked.
- Phase 6 hardening includes static repository contract assertions plus existing Postgres-backed derivation tests; full seeded HTTP integration for profile Dive Map reads remains optional future hardening.
- Profile Dive Map UI remains a V1 profile section. It intentionally does not expose memory, Journey, Passport, favorites, want-to-visit, manual count, region grouping, or filter controls.
- Future badges, Journey, and Passport work must consume the documented `user_dive_sites` boundary. If a future initiative bypasses it, source-of-truth conflicts will return.
- Final User Dive Map V1 verification passed on 2026-05-31, including targeted Go/TypeScript/web checks, repo-level `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `git diff --check`.
- Media ownership and basic qualifying-proof fields are identifiable through `media_posts.author_app_user_id`, `media_posts.dive_site_id`, media object ownership checks, deleted-state fields, and approved `dive_sites`.
- Shared/tagged Dive Memories must remain social/contextual; treating them as visit proof would corrupt Dive Map counts and downstream badge/journey/passport inputs.
- Dive Memories and tagged-user sharing are deferred from User Dive Map V1. Future memory integration remains blocked until a separate locked `dive-memories` privacy/tagging specification defines ownership, tagging, acceptance/decline, blocking, visibility, and authorization.
- V1 marker details must show only the user's own qualifying media posts; adding memory content during User Dive Map execution would be scope creep.
- Dive Journey and Dive Passport are future downstream consumers only and must not be implemented during this initiative.

### `dive-journey`

- Journey must remain downstream; using it as source of truth for Dive Map, badges, certifications, credentials, or Passport stats would corrupt the product model.
- `followers` visibility is implementable through existing `saved_users`, which backs profile follower/following counts and Follow/Following UI.
- Phase 2 added `journey_entries` and `journey_entry_media` only. `journey_entry_tagged_users` remains deferred; later phases must not implement tagged-user visibility by assumption.
- Phase 4 added owner-only media attachments. Attached media is storytelling metadata only and must not be treated as Dive Map proof or visited-site count input.
- Phase 7 added display-only generated-entry upsert helpers and tests. Regeneration is idempotent by `(user_id, source_type, source_id, type)`.
- Generated-entry producers still do not exist. Future Dive Map, badge, event/course, media, or memory producers must remain authoritative and use Journey only as a downstream display artifact.
- Manual Journey delete is implemented as owner-scoped soft deletion (`state='deleted'`) for active manual custom entries.
- Phase 8 added generated entry hide/archive support for active generated rows, scoped by owner, entry type, `source_type`, and `source_id`.
- Phase 9 documented the future Passport display path as read-only. Passport must consume Journey through existing profile Journey reads and must not derive stats, proof, badges, credentials, or certifications from Journey entries.
- Shared/tagged memories must not unlock locations or inflate visited-site counts through Journey.
- Profile Journey reads use `saved_users` for follower visibility and `user_blocks` for blocking. Any future dedicated follower model would need a targeted migration of that policy.
- Tagged-user Journey support has no reusable acceptance/decline/privacy policy. It is deferred; later phases must not introduce tags without a separate locked privacy/tagging decision.
- Shared Journey contracts include optional tagged-user presentation shapes, but these are not permission semantics and do not authorize backend tagged-user behavior.
- Profile Journey UI currently supports owner create/delete and read display. Manual edit UI and media attachment picker UI are not exposed yet.

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
