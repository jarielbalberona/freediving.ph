# Known Risks

Risk lifecycle labels:

- `active`: unresolved and must be considered before related execution.
- `accepted`: known and intentionally tolerated for now with an explicit reason.
- `resolved`: no longer open because later work fixed or verified it.
- `superseded`: replaced by a later rule, initiative, or implementation boundary.

- active: Autonomous execution can amplify vague specifications. Every phase must define scope, verification, and hard stops clearly.
- active: The runner can invoke Codex, but it cannot guarantee good judgment. Skills and phase files must constrain behavior.
- active: Generated reports are useful only if verification evidence is concrete. Avoid optimistic summaries without command output.
- active: Repo state may contain unrelated dirty changes. Agents must inspect and preserve them.
- active: Product areas involving safety, verification, authentication, privacy, payments, or destructive data changes require conservative hard-stop behavior.

## Initiative Risks

### `user-dive-map`

- resolved: Existing `media_posts` already has nullable `dive_site_id`, and Phase 2 added `user_dive_sites` as the required proof-based read model.
- resolved: Phase 2 added the `services/fphgo/internal/features/dive_map` sqlc query package foundation so derivation/read behavior does not get buried in media or profile services.
- active: `user_dive_sites` derivation is implemented for profile media post creation and ready tagged Moment completion. Existing repository behavior can recompute delete/retag/untag states, but no profile media post edit/delete endpoint exists yet; future lifecycle work must call recompute for affected old/new user-site pairs.
- active: `user_dive_sites.first_post_id` and `last_post_id` use `ON DELETE RESTRICT`; media lifecycle code must recompute/remove rows before any future hard deletion of proof posts.
- active: Moment upload intents do not unlock sites until the Moment media item is active, ready, approved, and still tagged to the same dive site as the owning media post.
- active: Profile Dive Map read APIs now use existing profile visibility semantics: `public` anonymous-visible, `members` signed-in visible, and `private` self-only. If product later wants different map-specific privacy semantics, that needs a separate locked decision.
- superseded: The profile repository previously contained a transitional media-post fallback for visited-site counts; Profile Experience Integration Phase 4 removed the legacy Profile Badges fallback and reinforced `user_dive_sites` as canonical.
- accepted: Phase 5 implemented the V1 map as a dense profile section/list with selected-site proof detail, not a full geographic map canvas. This is deliberate until a map-provider UX/runtime requirement is locked.
- accepted: Phase 6 hardening includes static repository contract assertions plus existing Postgres-backed derivation tests; full seeded HTTP integration for profile Dive Map reads remains optional future hardening.
- active: Profile Dive Map UI remains a V1 profile section. It intentionally does not expose memory, Journey, Passport, favorites, want-to-visit, manual count, region grouping, or filter controls.
- active: Future badges, Journey, and Passport work must consume the documented `user_dive_sites` boundary. If a future initiative bypasses it, source-of-truth conflicts will return.
- resolved: Final User Dive Map V1 verification passed on 2026-05-31, including targeted Go/TypeScript/web checks, repo-level `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `git diff --check`.
- active: Media ownership and basic qualifying-proof fields are identifiable through `media_posts.author_app_user_id`, `media_posts.dive_site_id`, media object ownership checks, deleted-state fields, and approved `dive_sites`.
- active: Shared/tagged Dive Memories must remain social/contextual; treating them as visit proof would corrupt Dive Map counts and downstream badge/journey/passport inputs.
- active: Dive Memories and tagged-user sharing are deferred from User Dive Map V1. Future memory integration remains blocked until a separate locked `dive-memories` privacy/tagging specification defines ownership, tagging, acceptance/decline, blocking, visibility, and authorization.
- active: V1 marker details must show only the user's own qualifying media posts; adding memory content during User Dive Map execution would be scope creep.
- superseded: Dive Journey and Dive Passport were future downstream consumers during User Dive Map execution; both later completed as separate downstream initiatives.

### `dive-journey`

- active: Journey must remain downstream; using it as source of truth for Dive Map, badges, certifications, credentials, or Passport stats would corrupt the product model.
- active: `followers` visibility is implementable through existing `saved_users`, which backs profile follower/following counts and Follow/Following UI.
- resolved: Phase 2 added `journey_entries` and `journey_entry_media` only. `journey_entry_tagged_users` remains deferred; later phases must not implement tagged-user visibility by assumption.
- resolved: Phase 4 added owner-only media attachments. Attached media is storytelling metadata only and must not be treated as Dive Map proof or visited-site count input.
- resolved: Phase 7 added display-only generated-entry upsert helpers and tests. Regeneration is idempotent by `(user_id, source_type, source_id, type)`.
- active: Generated-entry producers still do not exist. Future Dive Map, badge, event/course, media, or memory producers must remain authoritative and use Journey only as a downstream display artifact.
- active: Manual Journey delete is implemented as owner-scoped soft deletion (`state='deleted'`) for active manual custom entries.
- resolved: Phase 8 added generated entry hide/archive support for active generated rows, scoped by owner, entry type, `source_type`, and `source_id`.
- resolved: Phase 9 documented the future Passport display path as read-only. Passport must consume Journey through existing profile Journey reads and must not derive stats, proof, badges, credentials, or certifications from Journey entries.
- active: Shared/tagged memories must not unlock locations or inflate visited-site counts through Journey.
- active: Profile Journey reads use `saved_users` for follower visibility and `user_blocks` for blocking. Any future dedicated follower model would need a targeted migration of that policy.
- active: Tagged-user Journey support has no reusable acceptance/decline/privacy policy. It is deferred; later phases must not introduce tags without a separate locked privacy/tagging decision.
- active: Shared Journey contracts include optional tagged-user presentation shapes, but these are not permission semantics and do not authorize backend tagged-user behavior.
- active: Profile Journey UI currently supports owner create/delete and read display. Manual edit UI and media attachment picker UI are not exposed yet.
- resolved: Final Dive Journey verification passed on 2026-05-31, including Go DB/sqlc/all tests, shared types checks/tests, web type-check/test/lint, repo-level `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `git diff --check`.

### `dive-passport`

- active: Passport must remain a read-only aggregate/presentation layer; creating a `dive_passports` source-of-truth table or duplicating child source data would corrupt ownership boundaries.
- active: Child visibility rules across Profile, Dive Map, Profile Badges, Dive Journey, media, and memories must be confirmed before aggregate reads.
- active: Optional `passport_settings` must remain presentation-only and must not mutate child visibility, stats, badges, Journey entries, or Dive Map locations.
- active: Empty states must be explicit for missing Dive Map, empty Journey, no badges, no memories/media, and new user profiles.
- active: Dependencies must stay one-way into Passport; Passport must not feed or mutate Map, Journey, Badges, certifications, media, memories, or stats.
- resolved: Phase 1 confirmed Dive Memories are unavailable; Passport V1 must expose memories as an empty/deferred section or omit it according to the aggregate contract until a separate memory initiative exists.
- resolved: Phase 1 allowed optional settings only as presentation preferences and references to existing badge IDs. Any behavior that changes child visibility, stores copied child records, or invents featured-badge product rules must hard-stop.
- resolved: Phase 3 added the read-only Passport aggregate API. Current media and memories sections are fallback-only; later media/memory integration must use existing read boundaries and must not treat those records as Dive Map proof.
- resolved: Phase 4 added `passport_settings` for presentation preferences only. The table is not Passport source truth and must never store copied child records or change child-system visibility.
- resolved: Phase 6 added the web Passport profile surface. It reads the aggregate contract and mutates only owner presentation settings; it must not be expanded into client-side source calculation or verification claims.
- active: Dive Memories remain deferred in the Passport UI and are presented as unavailable rather than as inferred/shared content.
- resolved: Phase 7 proved Passport forwards viewer identity to child readers and does not synthesize missing map, badge, Journey, media, or memory data. The remaining visibility risk is child-reader drift, not Passport-owned policy.
- resolved: Phase 8 confirmed Profile, Dive Map, and Dive Journey do not import `dive_passport`; the dependency direction remains one-way into Passport.
- accepted: Phase 9 improved static accessibility and responsive safeguards, but no manual browser or assistive-technology smoke test was run per autonomous execution constraints.
- active: Full repo `pnpm test` currently fails in `apps/mobile` because unrelated dirty Expo dependency drift changed `@expo/ui` from `~56.0.14` to `~56.0.15` while the mobile foundation contract test still expects `~56.0.14`.

### `profile-experience-integration`

- active: Integration hardening must not blur source ownership: Profile Badges own achievements/credentials/stats, Dive Map owns proof/location, Dive Journey owns storytelling timeline, and Dive Passport owns presentation aggregation only.
- active: Dive Sites Visited must align with `user_dive_sites`; transitional or fallback counting must not count memories, Journey entries, Passport state, or shared/tagged content.
- active: Badge-origin Journey entries must remain display-only and idempotent; Journey must not award, verify, revoke, or mutate badges.
- active: Passport must remain read-only and must not duplicate source data while composing profile, badges, map, journey, memories, media, and stats.
- active: Public profile UX can easily become redundant or contradictory if standalone module sections and Passport summaries are not deliberately composed.
- active: Phase 1 confirmed Dive Memories are still unavailable; any shared/tagged memory integration remains blocked on a separate locked privacy/tagging initiative.
- active: Phase 1 found unrelated mobile Expo dependency drift in `apps/mobile/package.json` and `pnpm-lock.yaml`; repo-level `pnpm test` fails until that mobile contract drift is resolved.
- resolved: Phase 4 removed the legacy Profile Badges fallback to owned `media_posts.dive_site_id`; environments missing `user_dive_sites` migration will now fail badge visited-site reads instead of silently using non-canonical truth.
- resolved: Phase 3 found no current cross-module visibility conflict, but Dive Memories/tagged-user sharing remains unavailable and must not be inferred by any profile experience module.
- active: Phase 5 confirmed Journey can accept downstream map-style generated entries idempotently, but no actual map milestone producer/catalog was added. Future milestone producers must derive only from `user_dive_sites` and must not let Journey unlock locations.
- resolved: Phase 6 confirmed Passport reads Journey through Journey-owned visibility filtering. Future changes to Journey visibility can affect Passport output and must be tested at the Journey boundary, not patched inside Passport.
- accepted: Phase 7 preserved Passport and standalone source sections together in the profile Diving tab. That is coherent for V1, but a future UX decision may still split Passport into a route or tab if the profile grows too dense.
- resolved: The 2026-06-01 profile UI hardening split profile experience modules into separate top-level tabs and reframed Dive Memories as Dive Map entry context rather than a top-level profile stream.
- resolved: Phase 8 fixed Passport DTO drift by making shared Passport child previews compact. Any web view needing full child fields must call the owning child API directly instead of treating Passport as a full source mirror.
- accepted: Phase 9 recommended follow-up initiatives for Dive Memories/privacy, map milestone producers, profile UX density, and mobile profile experience. None block final verification of the current locked integration initiative.
- active: Full repo `pnpm test` currently fails only because unrelated dirty mobile dependency drift changed `@expo/ui` from the contract-expected `~56.0.14` to `~56.0.15`.

### `local-ai-memory-hardening`

- resolved: Existing completed initiatives contained non-canonical `Status: completed` phase metadata; Phase 2 migrated active status metadata to `Status: passed`.
- resolved: Runner lacked preflight validation for lock/readiness, required files, report folder, phase numbering, phase status, and dependencies; Phase 3 added and verified preflight.
- resolved: Initiative dependency sequencing previously lived only in prompts; Phase 4 added `depends_on` documentation and runner validation.
- resolved: Completed initiative lifecycle metadata contained stale next-target and execution-started values; Phase 5 corrected the metadata and documented lifecycle ownership.
- resolved: Risk lifecycle cleanup applied canonical labels across `.ai/state/known-risks.md` in Phase 6.
- resolved: Runner report quality requirements were strengthened in Phase 7 across templates, `.ai/README.md`, the execution skill, and runner-generated reports.
- resolved: Final Phase 8 verification passed for runner tests, runner formatting/lint checks, repo lint, repo typecheck, repo build, preflight check-only, and git diff whitespace.
- accepted: V2 database/indexing remains unjustified. The current pain points were lifecycle, validation, dependency, report, and test discipline problems, not retrieval-scale problems.

### `dive-memories`

- resolved: Follower visibility was confirmed in Phase 1 against existing `saved_users` relationship semantics already used by Dive Journey.
- resolved: Phase 2 added non-destructive `dive_memories`, `dive_memory_media`, and `dive_memory_tagged_users` schema plus repository/sqlc foundation without adding any `user_dive_sites` write path.
- resolved: Phase 2 repository integration tests prove Dive Memory create/update/tag/media/delete behavior does not create Dive Map ownership and map marker memory reads remain gated by existing `user_dive_sites` ownership.
- resolved: Phase 3 added owner-scoped CRUD/read APIs and route wiring with profile-visible reads filtered by deleted state, visibility, `saved_users` follower semantics, accepted tag status, and `user_blocks`.
- active: Phase 3 public profile memory reads expose profile-authored memories only. Tagged/shared memory display inside map markers remains deferred to later map integration and must still require `user_dive_sites` ownership.
- resolved: Phase 4 added owned/active existing-media attachment authorization, request/response `mediaIds`, deterministic ordering, and memory-read media hydration without touching `user_dive_sites`.
- resolved: Phase 5 added tag lifecycle APIs with pending defaults, accepted/declined/hidden transitions, tagged-user management reads, and bidirectional `user_blocks` enforcement.
- resolved: Phase 6 added shared TypeScript contracts for Dive Memories and tag lifecycle without exposing proof, unlock, badge, credential, or visited-site-count fields.
- resolved: Phase 7 added Dive Map marker detail memory previews only after `user_dive_sites` marker gating; memories still do not unlock markers, change proof fields, or affect visited-site counts.
- resolved: Phase 8 added display-only Journey integration and read-only Passport memory previews through Dive Memories-owned visibility reads.
- accepted: Journey cannot represent accepted-tag visibility directly. Tagged memories are represented as private generated Journey display rows in V1 to avoid privacy leakage.
- accepted: Phase 9 implemented tagged-memory management as an owner-only pending count/fallback. A complete tagged-memory inbox/notification UX remains future work rather than an inferred V1 product decision.
- resolved: Initial full web type-check drift in payments/schools and full web test drift in management school route contracts were corrected before final Dive Memories verification.
- resolved: Final Dive Memories verification passed on 2026-06-01, including targeted Go checks, app route checks, db checks, sqlc generation, shared type-check/tests, web type-check/lint/test, repo lint/typecheck/test/build, and `git diff --check`.
- active: Memory integration must not create source-of-truth drift: memories cannot unlock map locations, inflate counts, mutate `user_dive_sites`, award badges, or verify credentials.
- active: Repo-level `pnpm test` may remain polluted by unrelated mobile `@expo/ui` drift; execution must use targeted checks if that persists.
- active: Local shell PATH drift can hide installed Go, pnpm, and sqlc binaries. Use explicit PATH entries for verification if the default shell omits `/usr/local/go/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, or `/Users/jariel/go/bin`.

### `mobile-web-parity`

- accepted: Initiatives 01-05 passed static verification but their original execution reports recorded iOS Simulator smoke as environment-blocked. Initiative 06 confirmed the simulator and Metro are now usable, but the earlier initiatives have not been retroactively runtime-smoked.
- accepted: Explore site detail save state is exact after a user acts, but direct-opened site detail responses do not currently expose initial `isSaved`; adding that would require a backend/shared detail contract change.
- active: Native Explore map remains deferred until list/detail parity is stable and a map-provider/runtime requirement is explicitly worthwhile.
- active: Mobile parity work must continue to preserve the proof-based Dive Map boundary: saves, likes, reviews, presence, and affinity are not visit proof and must not mutate or imply `user_dive_sites` ownership.
- accepted: Mobile Groups intentionally does not expose archive/delete, invite-by-user-id, member actions, or group image/cover media wiring in initiative 07. Those are role/destructive/media-policy surfaces and should stay web/management scope until a tighter mobile management requirement exists.
- active: Group access, membership, roles, posting rights, and private visibility remain backend-canonical. Mobile UI state and cached lists must never grant access or management capability.
- accepted: Mobile Events attendee pass displays canonical token/link and read-only pass state, not a generated QR image. Native QR rendering needs a dedicated dependency/UX choice or backend-provided QR image before claiming scannable QR parity.
- accepted: Mobile Events payment proof upload in initiative 08 supports image proof through existing media upload contracts. File/document proof remains unimplemented because mobile has no document picker dependency in this scope.
- active: Event organizer approval/rejection, payment review, check-in, setup, program management, prize/sponsor management, and destructive event actions remain split to initiative 09. Attendee mobile screens must not expose or simulate those controls.
- active: Event participation, payment status, pass validity, private visibility, and post permissions remain backend-canonical. Mobile cache state must never grant access or management capability.
- resolved: Initiative 09 added backend-gated mobile organizer participant management, payment review, and manual pass check-in. These actions use existing organizer endpoints and do not grant authority from mobile cache state.
- accepted: Initiative 09 intentionally left full event setup/settings/program/sponsor/award management and destructive event settings on web. Those are not field-critical mobile workflows and need tighter UX/destructive-action requirements before native exposure.
- accepted: Initiative 09 iOS smoke rendered a live organizer workspace but did not submit dirtying approve/reject/check-in/payment-review mutations. Manual QA should use seeded throwaway data for mutation proof.
- accepted: Mobile Schools initiative 10 cannot show a true public instructor list because the current public school/course contracts do not expose school instructors. Adding it requires a backend/shared contract, not a mobile-local DTO.
- accepted: Mobile Schools payment proof upload supports image receipts through existing `course_booking_receipt` media context. Document/PDF proof remains out of scope because no document-picker dependency was introduced.
- active: School management, booking approval/rejection, payment review, member management, and destructive school actions remain split to later initiatives. Public booking screens must not expose or simulate those controls.
- active: School/course availability, booking status, payment status, cancellation eligibility, and receipt ownership remain backend-canonical. Mobile cache state must never grant booking/payment capability.
- resolved: Initiative 11 replaced the mobile school-management placeholder with backend-gated management reads and owner/admin operational actions for bookings, payments, and sessions.
- accepted: Initiative 11 intentionally leaves full school profile editing, course/session authoring, member mutation, payment-method mutation, and destructive school/course/session deletion on web pending tighter mobile product requirements.
- accepted: Raw `freediving-ph-app://management/schools` is not an Expo Router route. App-internal web/notification URLs should go through the link resolver, which maps `/management/schools` and `/schools/[slug]/manage` to `manage-schools`.
- accepted: Initiative 11 iOS smoke rendered live owner school management but did not submit dirtying booking/payment/session mutations. Manual QA should use seeded throwaway records for mutation proof.
- accepted: Mobile Instructor initiative 12 exposes raw structured location code fields because backend submission requires at least one structured code and no native PSGC/location picker was introduced in scope.
- accepted: Mobile Instructor certification proof upload supports image proof through existing `instructor_certification_proof`. Document/PDF proof remains out of scope.
- active: Instructor verification, rejection, suspension, and admin proof review remain web/admin-only. Mobile must not present approval/rejection controls or fake verification state.
- active: School creation eligibility remains backend-canonical. A user should be approved before creating their own school, while instructors may belong to multiple schools.
- accepted: Mobile Search initiative 13 intentionally implements only backend-supported people and dive-site search plus authenticated saved hub. Broad/global search across Chika, events, groups, schools, media, or admin/management remains deferred until a safe backend/shared contract and visibility model exist.
- accepted: Mobile Learn in initiative 13 uses compact native summaries and product navigation rather than copying full web SEO guide pages. Full article parity remains web-owned unless product decides mobile should host long-form guide content.
- active: Search and saved surfaces must continue to respect backend visibility, block, moderation, private content, and auth rules. Mobile must not add client-only search indexes or cached results that bypass canonical backend policy.
- accepted: Mobile Safety initiative 14 adds user-facing report/block controls but intentionally does not submit real reports or block users during automated smoke. Manual QA should use throwaway accounts or seeded non-critical data for mutation proof.
- active: Mobile report entry points must stay limited to backend/shared-supported target types. Adding media, group, event, school, or Explore reporting requires explicit shared target contracts and backend validation first.
- active: Block effects on messaging, buddies, profile visibility, and private content remain backend-canonical. Mobile UI may hide actions after backend success, but it must not simulate access policy client-side.
- resolved: Initiative 16 added explicit resolver coverage for implemented auth/account/search routes so `/profile`, `/profile/settings`, `/search`, `/sign-in`, `/sign-up`, and `/onboarding` no longer depend on unsupported fallback behavior or username guessing.
- active: Unsupported web-owned or unfinished URLs must remain unsupported/browser fallback until the corresponding mobile route is genuinely implemented. Routing them to generic Home would hide parity gaps and create bad notification behavior.
- resolved: Initiative 15 added a backend-gated mobile moderation triage route for report list/detail/filter/search and audit-note-backed report status updates.
- accepted: Initiative 15 intentionally leaves user sanctions, content hide/unhide, super-admin panels, and other destructive moderation actions on web until a stricter mobile destructive-action policy is approved.
- accepted: Initiative 15 iOS smoke rendered the moderation triage queue but did not submit dirtying status mutations. Manual QA should use seeded throwaway reports for mutation proof.
- active: Moderation permissions, report visibility, status transitions, and audit behavior remain backend-canonical. Mobile cache state must never be treated as moderation authority.
- resolved: Initiatives 01-05 originally retained environment-blocked iOS smoke records, but the 2026-06-01 post-parity mobile QA hardening pass retroactively opened the relevant auth/onboarding/profile/media/Chika/messaging/notification/buddy routes on iPhone 17 Pro Max and fixed the runtime defect found during that pass.
- accepted: Final mobile-web parity gate keeps high-risk destructive/admin/management sub-surfaces web-owned where mobile policy is not tight enough: event setup/destructive settings, school authoring/destructive management, super-admin panels, and destructive moderation actions.
- active: Before public release, manual QA must still use seeded throwaway data for mutations that automated smoke intentionally avoided or could not safely complete: reports, blocks, booking/payment/session transitions, event check-in/payment review, media comments/social actions, instructor application proof upload, moderation status updates, and full multi-role denial/allowance checks.
- resolved: The 2026-06-01 post-parity QA pass fixed a React Native runtime text-string error in `PublicProfileScreen` by wrapping the public-profile error retry label in `Text`.
- resolved: The 2026-06-01 seeded mutation QA pass proved local simulator mutations for messaging, event join, group join/post, and Chika create/reply against throwaway/runtime-smoke data.
- resolved: The 2026-06-01 seeded mutation QA pass fixed Chika reply false-draft behavior caused by broad thread-list query cache patching matching non-list Chika caches after a successful backend commit.
- resolved: Full role-matrix QA completed on 2026-06-01 in report 21 using ten Clerk test identities, account-by-account iOS Simulator settings/route proof, and real Clerk JWT API authorization checks.
- superseded: The 2026-06-01 QA identity pack assessment confirmed the existing `runtime_smoke_*` users are database fixtures, not mobile sign-in identities. Report 20 superseded the absolute identity blocker by creating/confirming Clerk test users and mapping them into local DB users.
- resolved: Disposable `QA Mobile Parity` records now exist for media, Chika, buddy request, message thread, group, event, school/course/session/booking, instructor profiles/certifications, and moderation reports.
- resolved: Clerk-backed simulator sessions were proven for member A and moderator, including member moderation denial, member media like/save, moderator queue access, and moderator report status transition with audit note.
- resolved: Public-release role-matrix simulator proof completed for member B, instructor applicant, approved instructor, school owner, event organizer, group owner, super admin, and target user in report 21.
- resolved: Mutation-heavy QA completed against disposable local `QA Mobile Parity` records using real Clerk JWTs for media comments/social actions, block/unblock, buddy lifecycle, event payment/check-in review, school booking/payment/session review, instructor proof/submission, and super-admin report access.
- resolved: Mobile profile tab parity no longer stops at a compact identity summary. Report 22 added the same icon-only tab order as web and renders real mobile Dive Map, Dive Journey, and Dive Passport tab content from existing shared/backend contracts.
- accepted: Profile tabs are now icon-only on web and mobile by product direction. Accessibility labels/titles remain, but no browser, simulator, or assistive-technology smoke was run in the focused correction pass.
- accepted: Final parity QA remains local/dev proof. Production/staging release must still run the normal release process, and physical-device binary picker/store QA is outside the mobile-web parity initiative.
