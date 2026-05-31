# Decisions

## 2026-05-31: AI Memory V1 Is Markdown-First

Decision: Project AI memory and initiative execution state will live in repository markdown files for V1.

Rationale: The current goal is to reduce manual Codex prompt loops, not build a retrieval platform. Markdown is auditable, diffable, and cheap.

Consequences:

- No Postgres, pgvector, embeddings, vector databases, dashboards, or cloud orchestration in V1.
- Initiative state changes must be visible in git diffs.
- Any future V2 storage/indexing system must justify itself against this simpler baseline.

## 2026-05-31: Dive Memories Deferred From User Dive Map V1

Decision: Dive Memories and tagged-user sharing are deferred from User Dive Map V1 and require a separate locked privacy/tagging specification.

Rationale: The prior User Dive Map initiative included Dive Memories, memory media, tagged users, tag acceptance/blocking, and shared-memory visibility behavior, but the repository has no existing `dive_memories` module and no locked privacy policy for tagged-user access. Implementing those rules during User Dive Map execution would require product guessing.

Consequences:

- User Dive Map V1 remains proof-based and uses qualifying user-owned `media_posts.dive_site_id` as the only unlock source.
- V1 marker details may show only the target user's own qualifying media posts for the unlocked site.
- `dive_memories`, `dive_memory_media`, `dive_memory_tagged_users`, memory CRUD, tagged-user access, tag acceptance/decline, blocking behavior for memory tags, shared-memory visibility, and showing shared/tagged memories inside map markers are out of scope for User Dive Map V1.
- Future shared-memory marker integration must wait for a separate locked `dive-memories` initiative.

## 2026-05-31: Dive Memories V1 Visibility Policy

Decision: Dive Memories V1 supports `public`, `followers`, `tagged`, and `private` visibility. `followers` uses the existing `saved_users` follower semantics already used by Dive Journey.

Rationale: Phase 1 discovery found repository-backed follower behavior in `saved_users` and existing Dive Journey visibility filtering using `viewer_follows`. Reusing that boundary avoids inventing a new relationship model.

Consequences:

- `followers` memory visibility is allowed in V1.
- If the saved/follower model changes later, Dive Memories and Dive Journey must be tested together.
- Tagged-user access still requires tag status and blocking checks; follower visibility does not override tag decline/hidden or blocking behavior.

## 2026-06-01: Tagged Memories Use Private Journey Display Rows In V1

Decision: When Dive Memories generate downstream Dive Journey display rows, `public` and `followers` visibility are preserved, while `tagged` and `private` memories are written as private Journey display rows.

Rationale: Dive Journey V1 supports `public`, `followers`, and `private` visibility, but it does not own accepted-tag visibility semantics. Mapping tagged memories to private Journey rows prevents leaking tag-only memories through a downstream storytelling surface.

Consequences:

- Dive Memories remain the source of truth for tagged-user access.
- Journey memory entries remain display-only and cannot authorize tagged-user visibility by themselves.
- A richer shared/tagged Journey display requires a separate locked Journey visibility extension or memory inbox UX decision.

## 2026-06-01: Profile Experience Modules Use Separate Top-Level Tabs

Decision: Public/user profile experience modules are exposed as top-level tabs in this order: Posts, Badges, Diving, Dive Map, Dive Journey, Dive Passport. Dive Memories are contextual stories inside Dive Map entry/site details rather than a competing top-level profile tab.

Rationale: Stacking all modules inside one Diving tab made module ownership blurry and made Dive Memories look like a parallel content stream. The profile UI should expose each source-owned module directly while preserving the rule that Dive Memories are attached to proof-backed Dive Map entries.

Consequences:

- Posts remains the raw media/content stream.
- Badges, Dive Map, Dive Journey, and Dive Passport remain separate source-owned surfaces.
- Diving is the overview for presence and dive-site affinity only.
- Dive Memories are accessed through selected Dive Map entry details and must not create or unlock map entries.
