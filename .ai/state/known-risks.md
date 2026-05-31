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
