# Current State

The repository is a pnpm monorepo with:

- `apps/web`: Next.js web frontend.
- `apps/mobile`: mobile workspace present in the repo.
- `services/fphgo`: canonical Go backend for new API work.
- `packages/types`: shared TypeScript contracts.
- `packages/config`, `packages/db`, `packages/ui`, `packages/utils`: shared support packages.

AI memory V1 has been initialized as repository-local markdown under `.ai`. No application behavior depends on it.

Before executing an initiative phase, read the relevant `.ai/core` files, this state file, `known-risks.md`, `verification-status.md`, the initiative overview, and the current phase file.

## Initiatives

### `user-dive-map`

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Initiative path: `.ai/initiatives/user-dive-map/`
- Locked date: 2026-05-31
- Relocked date: 2026-05-31
- Previous execution status: Phase 1 previously blocked on unresolved Dive Memories/tagged-user privacy rules before application code changes.
- Latest planning status: blocker resolved by scope correction. Dive Memories and tagged-user sharing are deferred from User Dive Map V1 and require a separate locked privacy/tagging specification.
- Latest execution status: completed on 2026-05-31. All User Dive Map V1 phases passed, final verification passed, and the initiative final report was written at `.ai/initiatives/user-dive-map/reports/final-report.md`.
- Notes: User Dive Map is authored as a proof-based initiative. A user unlocks a dive site only through the user's own qualifying media post tagged to `dive_site_id`. V1 marker contents show only the user's own qualifying media posts for that site. Shared/tagged memories must not unlock locations or inflate visited-site counts, and memory content must not appear in map markers until a separate Dive Memories initiative is specified and implemented.

### `dive-journey`

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Initiative path: `.ai/initiatives/dive-journey/`
- Locked date: 2026-05-31
- Latest execution status: completed on 2026-05-31. All Dive Journey phases completed, final verification passed, and the initiative final report was written at `.ai/initiatives/dive-journey/reports/final-report.md`.
- Notes: Dive Journey is authored as the downstream storytelling/timeline layer. It supports manual, generated, media-attached, and conditionally tagged-user entries, but must never become source of truth for Dive Map, visited-site counts, badges, certifications, credentials, or Dive Passport stats.

### `dive-passport`

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Initiative path: `.ai/initiatives/dive-passport/`
- Locked date: 2026-05-31
- Latest execution status: completed on 2026-05-31. All Dive Passport phases completed, final targeted verification passed, local `fph` and `fph_test` migrations reached version 86, and the initiative final report was written at `.ai/initiatives/dive-passport/reports/final-report.md`. Repo-level `pnpm test` is blocked by unrelated mobile Expo dependency drift outside Passport scope.
- Notes: Dive Passport is authored as the public diver identity/showcase layer. It is an aggregate/read model over Profile, Dive Map, Profile Badges, Dive Journey, media, memories, and summary stats, and must never become a competing source of truth or mutate child systems.

### `profile-experience-integration`

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Initiative path: `.ai/initiatives/profile-experience-integration/`
- Locked date: 2026-05-31
- Latest execution status: completed on 2026-05-31. All Profile Experience Integration phases completed, final targeted verification passed, and the initiative final report was written at `.ai/initiatives/profile-experience-integration/reports/final-report.md`. Repo-level `pnpm test` remains blocked by unrelated mobile Expo dependency drift outside integration scope.
- Latest UI hardening status: focused profile tab integration update completed on 2026-06-01. Profile tabs now expose Posts, Badges, Diving, Dive Map, Dive Journey, and Dive Passport as separate surfaces, with Dive Memories accessible through selected Dive Map entry details rather than as a top-level profile tab.
- Notes: Profile Experience Integration is authored as the final cross-module audit/hardening initiative for Profile Badges, User Dive Map, Dive Journey, and Dive Passport. It verifies source-of-truth boundaries, visibility/privacy consistency, shared contracts, and public profile UX composition without changing locked product ownership rules.

### `local-ai-memory-hardening`

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Initiative path: `.ai/initiatives/local-ai-memory-hardening/`
- Source assessment: `.ai/initiatives/local-ai-memory-hardening/reports/assessment-report.md`
- Latest execution status: completed on 2026-05-31. All Local AI Memory Hardening phases passed, final verification passed, and the initiative final report was written at `.ai/initiatives/local-ai-memory-hardening/reports/final-report.md`.
- Notes: This initiative is tooling-only. It may modify `.ai`, `.codex/skills`, `tools/ai-runner`, package scripts, and runner tests. It must not modify FPH application features.

### `dive-memories`

- Status: locked
- Ready for execution: yes
- Execution started: yes
- Initiative path: `.ai/initiatives/dive-memories/`
- Dependencies: `user-dive-map`, `dive-journey`, `dive-passport`, `profile-experience-integration`
- Latest execution status: completed on 2026-06-01. All Dive Memories phases passed, final verification passed, and the initiative final report was written at `.ai/initiatives/dive-memories/reports/final-report.md`.
- Notes: Dive Memories are site-attached social/contextual records for V1. They are not proof of visiting a dive site and must not unlock Dive Map locations, inflate visited-site counts, mutate `user_dive_sites`, award badges, or verify credentials.

### `mobile-web-parity`

- Status: locked
- Ready for execution: partial
- Execution started: yes
- Initiative path: `.ai/initiatives/mobile-web-parity/`
- Source assessment: `docs/mobile-web-parity-assessment.md`
- Latest planning status: authored on 2026-06-01 as a multi-initiative parity plan from assessment lock through final release gate.
- Latest execution status: Clerk test user role QA completed with PASS WITH ISSUES on 2026-06-01. Report 20 created/confirmed Clerk test users, mapped all ten QA identities into the local DB, seeded disposable `QA Mobile Parity` records, proved member A and moderator simulator sessions, proved member moderation denial, media like/save, moderator queue access, and a report status transition with audit note. Full public-release role/mutation QA remains incomplete for the remaining role accounts and mutation-heavy flows.
- Latest readiness lock: corrected on 2026-06-01. Sequence dependency is not `Blocked`; autonomous implementation is intended to proceed through initiatives marked `Ready` and `Ready After Previous` in canonical order.
- Safe next execution target: continue role-matrix QA with the seeded Clerk test identities. Public-release readiness still needs account-by-account simulator proof for the remaining role accounts and destructive/payment/report/block/media workflows.
- Execution prompts: `.ai/initiatives/mobile-web-parity/execution-prompts.md`.
- Autonomous execution statuses: `00-mobile-web-parity-assessment-lock.md` is `Done`; `01-auth-onboarding-account-setup.md` is `PASS WITH ISSUES` because static checks passed and iOS Simulator smoke was environment-blocked at execution time; `02-profile-core-badges-dive-identity.md` is `PASS WITH ISSUES` because static checks passed and iOS Simulator smoke was environment-blocked at execution time; `03-media-posts-comments-deep-links.md` is `PASS WITH ISSUES` because static checks passed and iOS Simulator smoke was environment-blocked at execution time; `04-chika-forums-parity.md` is `PASS WITH ISSUES` because static checks passed and iOS Simulator smoke was environment-blocked at execution time; `05-messaging-notifications-buddy-relationships.md` is `PASS WITH ISSUES` because static checks passed and iOS Simulator smoke was environment-blocked at execution time; `06-explore-dive-sites-parity.md` is `PASS` with static checks and iOS Simulator smoke passed; `07-groups-parity.md` is `PASS` with static checks and iOS Simulator smoke passed; `08-events-attendee-parity.md` is `PASS` with static checks and iOS Simulator smoke passed; `10-schools-public-courses-bookings.md` is `PASS` with static checks and iOS Simulator smoke passed; `12-instructor-application-profile-parity.md` is `PASS` with static checks and iOS Simulator smoke passed; `13-saved-search-learn-guides.md` is `PASS` with static checks and iOS Simulator smoke passed; `14-user-safety-report-block.md` is `PASS` with static checks, shared type checks, and iOS Simulator smoke passed; `16-navigation-deep-linking-platform-hardening.md` is `PASS` with static checks and iOS Simulator smoke passed; `09-events-organizer-management-parity.md` is `PASS` with static checks and iOS Simulator smoke passed; `11-school-management-parity.md` is `PASS` with static checks and iOS Simulator smoke passed; `15-admin-moderation-mobile-triage.md` is `PASS` with static checks and iOS Simulator smoke passed; `17-final-parity-audit-and-release-gate.md` is `PASS WITH ISSUES` because final checks passed but the release report keeps accepted runtime and destructive-scope gaps explicit.
- Decision-gated initiatives: none at the initiative level after the 2026-06-01 readiness correction. Specific sub-scopes must still hard-stop if they expose unresolved product, destructive-action, auth, privacy, safety, or missing-contract ambiguity.
- Blocked initiatives: none at the initiative level after the 2026-06-01 readiness correction.
- Verification policy: static/code-wise checks remain required. iOS Simulator smoke testing is required for mobile UI, navigation, auth/onboarding, deep-link, media, form, upload, permission, admin/management mobile screen, or user-facing screen changes, and is required for the final parity audit. Android emulator and physical-device testing remain optional unless an initiative explicitly requires Android-specific behavior. If iOS Simulator testing is unavailable or environment-blocked, implementation reports must document the exact command, failure reason, cause classification, static verification result, and manual checklist instead of claiming simulator verification passed.
- Latest QA smoke status: initiatives 01-05 now have retroactive iOS Simulator route coverage. Seeded local mutation smoke has passed for messaging, event join, group join/post, and Chika create/reply. Clerk test role QA now has real mobile sessions for member A and moderator, local DB mappings for all ten QA identities, and disposable records for the main remaining surfaces. Full role-matrix and destructive/payment/report/block/media mutation QA remain incomplete until the rest of the role accounts are simulator-smoked.
- Notes: The plan targets user-facing capability parity with native mobile UX, not pixel-for-pixel web layout copying. Backend and shared contracts remain canonical. Mobile must not treat placeholders as implemented, bypass auth/privacy/block/moderation/role rules, or use client cache/local state as durable truth. Dive Map/Passport/Journey/Memories phases must preserve the proof-based rule that only a user's own qualifying media post tagged to a dive site unlocks/owns that Dive Map location; tagged/shared memories alone must not unlock sites or inflate visited-site counts.
