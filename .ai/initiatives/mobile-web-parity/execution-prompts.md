# Mobile-Web Parity Execution Prompts

Status: locked
Ready for execution: partial
Last readiness correction: 2026-06-01

Use these prompts one at a time or use the full autonomous implementation prompt at the end of this file. Before executing any prompt, read `.ai/README.md`, `.ai/core/*`, `.ai/state/current-state.md`, `.ai/initiatives/mobile-web-parity/README.md`, and the named initiative file. Include initiatives marked `Ready` and `Ready After Previous`; do not stop merely because the next initiative depends on the previous one if the previous one is now complete.

## Verification Policy

Static/code-wise verification remains required for every implementation initiative:

- mobile type-check
- targeted mobile tests
- shared type tests if shared contracts changed
- web type-check if shared contracts changed
- Go/backend tests if backend code changed
- `git diff --check`

iOS Simulator smoke testing is required for initiatives that change mobile UI, navigation, auth flow, deep links, media flows, forms, uploads, permission flows, admin/management mobile screens, or user-facing screens. It is also required for the final parity audit.

The agent must inspect `apps/mobile/package.json` and repo scripts before choosing the command. Suggested commands to evaluate:

- `pnpm --filter @freediving.ph/mobile ios`
- `pnpm -C apps/mobile ios`
- `pnpm -C apps/mobile expo run:ios`
- `npx expo run:ios`

If the simulator run is unavailable or blocked by local machine setup, toolchain, signing, simulator availability, or environment, report the exact command, failure reason, classification, static verification result, and manual smoke checklist. Do not claim simulator verification passed when it did not run.

Status rules:

- `Done`: static checks passed and required iOS Simulator smoke passed, or simulator was unavailable for documented environment reasons and manual checklist was provided with no code-level blockers found.
- `PASS WITH ISSUES`: static checks passed but simulator smoke was blocked by environment or found non-blocking UI issues.
- `Blocked`: simulator smoke finds a runtime crash, broken navigation, auth loop, severe UI regression, or code-caused runtime failure.

## Current Ready Prompt

### 01 Auth, Onboarding, And Account Setup

```text
We are working in the Freediving Philippines repository.

Execute only this initiative:

.ai/initiatives/mobile-web-parity/01-auth-onboarding-account-setup.md

Do not work on other initiatives except where required by this initiative's dependencies.

Read first:
- .ai/README.md
- .ai/core/project-brief.md
- .ai/core/architecture-rules.md
- .ai/core/product-rules.md
- .ai/core/conventions.md
- .ai/state/current-state.md
- .ai/initiatives/mobile-web-parity/README.md
- .ai/initiatives/mobile-web-parity/01-auth-onboarding-account-setup.md
- relevant web auth/onboarding/profile setup code
- relevant mobile auth/navigation/profile setup code
- shared profile/auth contracts
- backend profile/current-user routes if needed

Goal:
Implement mobile auth/onboarding/account setup parity so new authenticated users can complete required profile setup on mobile and existing complete users bypass onboarding correctly.

Scope:
- First-run onboarding route/screen if missing.
- Minimum profile setup.
- Username/display name validation if required.
- Profile completion state handling.
- Auth-gated redirects.
- Existing-user bypass.
- Account settings basics if included in initiative.
- Notification/session/logout setup only if part of account foundation.

Do not:
- Implement full profile parity here.
- Implement badges, Dive Map, Buddy relationships, schools, events, groups, or admin.
- Run Android emulator or physical-device tests unless the initiative explicitly requires Android-specific behavior.
- Skip required iOS Simulator smoke testing without documenting the command, blocker, and manual checklist.

Verification:
- Targeted mobile tests for onboarding/navigation/profile completion.
- Mobile type-check if available.
- Shared type tests if contracts changed.
- git diff --check.

Update:
- Initiative file status.
- .ai/state/current-state.md.
- Manual smoke checklist.

Final response:
1. Verdict
2. What changed
3. Files changed
4. Tests/checks
5. Remaining gaps
6. Next initiative recommendation
```

## Ready After Previous Prompts

### 02 Profile Core, Badges, And Dive Identity

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only this initiative:

.ai/initiatives/mobile-web-parity/02-profile-core-badges-dive-identity.md

Read the local .ai memory and initiative docs first.

Goal:
Implement mobile profile parity for core identity, badges, and compact dive identity surfaces.

Scope:
- Public profile header improvements.
- Own profile edit improvements.
- Avatar/cover support if backend/contracts exist.
- Basic diving identity fields if supported.
- Read-only badge showcase.
- Compact Dive Passport/Journey/Dive Map/Dive Memories summary.
- Profile tabs/sections.
- Privacy/blocked/incomplete states if already supported by backend.

Critical product rule:
Dive Map is proof-based. A user unlocks/owns a location only when they personally have at least one qualifying media post tagged to that dive site. Tagged/shared memories alone must not unlock a location or inflate visited-site counts.

Do not:
- Build full badge management unless initiative explicitly allows it.
- Build full native map unless already present and only needs wiring.
- Implement Buddy relationships here except showing existing relationship state if required.
- Implement schools/events/groups/admin.

Verification:
- Profile component tests.
- API hook tests if changed.
- Shared type tests if contracts changed.
- Mobile type-check.
- git diff --check.

Update initiative and .ai/state/current-state.md.

Final response format:
Verdict, summary, files changed, checks, remaining gaps, manual smoke checklist.
```

### 03 Media Posts, Comments, And Deep Links

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only:

.ai/initiatives/mobile-web-parity/03-media-posts-comments-deep-links.md

Goal:
Make mobile media posts first-class and parity-aligned with web for detail routing, social actions, comments, and deep links.

Scope:
- Media post detail route/screen.
- Open media post from feed, profile, notification, and deep link.
- Like/unlike.
- Comment list/create/delete if supported.
- Comment-like if supported.
- Save/bookmark if supported.
- Native full-screen media viewer.
- Share/copy link if supported.
- Preserve existing composer/upload/outbox behavior.

Do not:
- Rebuild media composer unless required for detail parity.
- Change backend unless a real contract gap exists.
- Implement unrelated profile/feed work.

Verification:
- Route/deep-link tests if possible.
- Media API hook tests.
- Component tests for loading/error/empty/social states.
- Mobile type-check.
- git diff --check.

Update initiative and state files.

Final response:
Verdict, implemented items, files changed, checks, remaining gaps, manual smoke checklist.
```

### 04 Chika Forums Parity

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only:

.ai/initiatives/mobile-web-parity/04-chika-forums-parity.md

Goal:
Bring mobile Chika/forums to functional parity with web where it matters for user-facing mobile behavior.

Scope:
- Chika category filtering.
- Thread list improvements.
- Thread detail deep links.
- Create thread validation/reliability.
- Comments/replies.
- Vote/reaction error handling.
- Pseudonymous category display and actor masking according to product/backend rules.
- Report actions if included in initiative, otherwise leave for user-safety initiative.
- Draft/outbox preservation.

Do not:
- Port the full web markdown editor unless the initiative proves it is already supported cleanly.
- Implement full moderator dashboard.
- Work on groups/events/media unrelated to Chika.

Verification:
- Targeted Chika tests.
- Route/deep-link tests if possible.
- Mobile type-check.
- git diff --check.

Update initiative and state.

Final response:
Verdict, summary, files changed, checks, remaining gaps, manual smoke checklist.
```

### 05 Messaging, Notifications, And Buddy Relationships

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only:

.ai/initiatives/mobile-web-parity/05-messaging-notifications-buddy-relationships.md

Goal:
Close mobile parity gaps for messaging entry points, notifications, Buddy Finder integration, and bilateral buddy relationships.

Scope:
- Distinguish Buddy Finder intents from actual buddy relationships.
- Add buddy relationship UI/API: send request, accept, decline, cancel outgoing, remove buddy, buddy list, incoming/outgoing requests.
- Add relationship state on profile.
- Add message entry from profile where allowed.
- Add message entry from Buddy Finder intent where allowed.
- Reuse existing thread if present.
- Notification routing to buddy/message targets.
- Mark read/delete notification controls if initiative includes them.

Respect:
- block rules
- privacy rules
- message request rules
- anti-spam/rate-limit expectations
- backend canonical relationship state

Do not:
- Bypass backend policy.
- Create duplicate messaging models.
- Implement realtime unless already established and low-risk.
- Work on groups/events/schools.

Verification:
- Buddy relationship tests.
- Messaging entry tests.
- Notification routing tests if possible.
- Mobile type-check.
- git diff --check.

Update initiative and state.

Final response:
Verdict, summary, files changed, checks, remaining gaps, manual smoke checklist.
```

### 06 Explore And Dive Sites Parity

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only:

.ai/initiatives/mobile-web-parity/06-explore-dive-sites-parity.md

Goal:
Implement mobile Explore/dive-site parity across browsing, detail, actions, submissions, and user contribution flows.

Scope:
- Dive site list search/filter/sort.
- Site cards and loading/error/empty states.
- Site detail improvements.
- Save/unsave site.
- Like/unlike site.
- Site updates/reports if backend supports.
- Suggest edit if supported.
- Submit new site.
- My submissions/status.
- Presence/affinity actions if supported.
- Reviews if supported.
- Related sites, community media, buddy intents if supported and reasonable.
- Native map only if initiative marks it ready.

Do not:
- Implement Explore admin/moderation unless initiative explicitly includes it.
- Build map first if list/detail parity is incomplete.
- Bypass proof-based Dive Map rules.

Verification:
- Explore API hook tests.
- Screen/component tests for filters/actions/submissions.
- Mobile type-check.
- Shared type tests if contracts changed.
- Backend tests only if backend changed.
- git diff --check.

Update initiative and state.

Final response:
Verdict, summary, files changed, checks, remaining gaps, manual smoke checklist.
```

### 07 Groups Parity

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only:

.ai/initiatives/mobile-web-parity/07-groups-parity.md

Goal:
Implement mobile group parity for discovery, group detail, posts, membership, invitations, creation, and lightweight group management if the initiative marks it ready.

Scope:
- Groups list/search/filter.
- Group detail.
- Join/leave/request join.
- Invite accept/reject.
- Member list and role display.
- Group posts list/detail if supported.
- Create group post.
- Create group.
- Group image/cover if supported.
- Basic settings if allowed.
- Member actions if allowed.
- Group deep links.
- User-facing report actions if included.

Do not:
- Implement full destructive group management unless initiative says Ready.
- Bypass role rules.
- Work on unrelated events/schools/admin.

Verification:
- Group route/component/API tests.
- Role-aware UI tests where possible.
- Mobile type-check.
- git diff --check.

Update initiative and state.

Final response:
Verdict, summary, files changed, checks, remaining gaps, manual smoke checklist.
```

### 08 Events Attendee Parity

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only:

.ai/initiatives/mobile-web-parity/08-events-attendee-parity.md

Goal:
Implement mobile attendee event parity without organizer management scope.

Scope:
- Event list/search/filter.
- Event detail improvements.
- Join/leave/interest.
- Attendee pass view if user-facing.
- Join form response if required.
- Payment instructions/proof upload if supported.
- Event posts/updates and reactions.
- Event deep links and notification routing.
- Event create only if confirmed as attendee/community creator scope.

Do not:
- Implement organizer dashboard or management.
- Implement participant approval/rejection/status changes.
- Implement payment proof review.
- Implement program/sponsors/awards/prizes management.
- Work on admin/moderation.

Verification:
- Event attendee route/component/API tests.
- Notification/deep-link tests if possible.
- Mobile type-check.
- Backend tests only if backend changed.
- git diff --check.

Update initiative and state.

Final response:
Verdict, summary, files changed, checks, remaining gaps, manual smoke checklist.
```

### 10 Schools Public, Courses, And Bookings

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only:

.ai/initiatives/mobile-web-parity/10-schools-public-courses-bookings.md

Goal:
Implement mobile parity for public school discovery, school profiles, courses, booking flow, and my bookings.

Scope:
- Schools list.
- School search/filter.
- School detail/profile.
- Instructor list on school.
- Courses list.
- Course detail.
- Sessions/schedules.
- Booking form.
- Payment instructions.
- Payment proof upload if supported.
- Booking status.
- My bookings list/detail.
- Cancel booking if policy allows.
- Booking notifications/deep links.
- Manage button for authorized users, linking to management only if management initiative exists.

Do not:
- Implement school management here.
- Implement instructor application here except linking to existing flow if needed.
- Bypass booking/payment policy.

Verification:
- School/course/booking mobile tests.
- Shared type tests if touched.
- Mobile type-check.
- Backend tests only if backend changed.
- git diff --check.

Update initiative and state.

Final response:
Verdict, summary, files changed, checks, remaining gaps, manual smoke checklist.
```

### 12 Instructor Application And Profile Parity

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only:

.ai/initiatives/mobile-web-parity/12-instructor-application-profile-parity.md

Goal:
Implement mobile instructor application and instructor profile parity while preserving backend verification and school-creation prerequisites.

Scope:
- Instructor application route.
- Instructor profile details.
- Certification list/create/edit/delete if supported.
- Certification proof upload if supported.
- Submit application / save profile semantics.
- Verification status display.
- Public instructor profile if needed by school/course flows.
- Link from school creation only when prerequisites are unmet.

Critical product rule:
A user should be an approved instructor before creating their own school. Instructors may belong to multiple schools.

Do not:
- Implement school management.
- Implement admin instructor verification/rejection actions.
- Fake approval/verification client-side.
- Implement full school creation unless covered by school initiatives.

Verification:
- Instructor application/profile tests.
- API hook tests if changed.
- Shared type tests if touched.
- Mobile type-check.
- git diff --check.

Update initiative and state.

Final response:
Verdict, summary, files changed, checks, remaining gaps, manual smoke checklist.
```

### 14 User Safety, Report, And Block

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only:

.ai/initiatives/mobile-web-parity/14-user-safety-report-block.md

Goal:
Implement mobile user-facing report/block parity across supported surfaces without building full moderation dashboards.

Scope:
- Report actions for supported target types.
- Block/unblock user controls.
- Blocked user/profile/content states.
- Report entry points from profile, media, Chika, buddy, group, event, and Explore where contracts support them.
- Clear submitted/error states.
- Respect existing backend moderation and block policy.

Do not:
- Implement moderator/admin dashboard.
- Implement suspension/read-only user actions.
- Invent shadowban or identity reveal behavior.
- Create new moderation policy.

Verification:
- Report/block API hook tests.
- Surface component tests for supported targets.
- Mobile type-check.
- Shared type tests if touched.
- Backend tests only if backend changed.
- git diff --check.

Update initiative and state.

Final response:
Verdict, summary, files changed, checks, remaining gaps, manual smoke checklist.
```

## Late-Sequence Ready After Previous Prompts

These are not blocked. They are late in the canonical sequence because they carry heavier role, management, or final-audit risk. Execute them automatically when earlier initiatives have terminal passing or accepted statuses. Stop inside the initiative only for a specific hard blocker.

### 09 Events Organizer Management Parity

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only this initiative when reached in the canonical sequence:

.ai/initiatives/mobile-web-parity/09-events-organizer-management-parity.md

Goal:
Implement mobile event organizer management parity using native mobile UX and strict role/action guards.

Critical guards:
- Confirm organizer/admin role before rendering management actions.
- Confirm destructive actions.
- Preserve audit/security expectations.
- Do not expose management routes to unauthorized users.
- Do not weaken web/backend role logic.

Do not:
- Implement admin/moderation unrelated to event organizing.
- Bypass organizer/admin role checks.
- Add destructive actions without existing backend policy and confirmation behavior.
- Run Android emulator or physical-device tests unless the initiative explicitly requires Android-specific behavior.
- Skip required iOS Simulator smoke testing without documenting the command, blocker, and manual checklist.

Verification:
- Role-gated route/component tests.
- API action tests/mocks.
- Mobile type-check.
- Backend tests if backend changed.
- git diff --check.

Update initiative and state.

Final response:
Verdict, summary, files changed, checks, remaining gaps, manual smoke checklist.
```

### 11 School Management Parity

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only this initiative when reached in the canonical sequence:

.ai/initiatives/mobile-web-parity/11-school-management-parity.md

Goal:
Implement mobile school management parity with strict owner/admin guards using existing backend/web policy as canonical truth.

Do not:
- Implement public school browsing or booking here.
- Implement instructor application/profile parity here.
- Bypass backend role, payment, or destructive-action policy.

Verification:
- Role-gated school management tests.
- API action tests/mocks.
- Mobile type-check.
- Backend tests if backend changed.
- git diff --check.

Update initiative and state.

Final response:
Verdict, summary, files changed, checks, remaining gaps, manual smoke checklist.
```

### 13 Saved, Search, Learn, And Guides

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only this initiative when reached in the canonical sequence:

.ai/initiatives/mobile-web-parity/13-saved-search-learn-guides.md

Goal:
Implement saved/search/learn/guide mobile parity for supported mobile surfaces and existing backend contracts.

Do not:
- Build global search without a defined backend/query contract.
- Recreate web SEO pages as native marketing pages by default.
- Treat placeholders as implemented.
- Work on admin/management search.

Verification:
- Saved/search/guide route and component tests.
- API hook tests if changed.
- Mobile type-check.
- Shared type tests if touched.
- git diff --check.

Update initiative and state.

Final response:
Verdict, summary, files changed, checks, remaining gaps, manual smoke checklist.
```

### 15 Admin And Moderation Mobile Triage

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only this initiative when reached in the canonical sequence:

.ai/initiatives/mobile-web-parity/15-admin-moderation-mobile-triage.md

Goal:
Implement mobile admin/moderation triage with read-only or explicitly supported low-risk actions unless destructive behavior is unambiguously backed by existing policy.

Do not:
- Build full destructive moderation by default.
- Expose super-admin panels without explicit need.
- Bypass backend role checks.
- Mix admin school/event/group owner workflows into moderation triage.

Verification:
- Role-gated moderation tests.
- API action tests/mocks.
- Mobile type-check.
- Backend tests if backend changed.
- git diff --check.

Update initiative and state.

Final response:
Verdict, summary, files changed, checks, remaining gaps, manual smoke checklist.
```

### 16 Navigation, Deep Linking, And Platform Hardening

Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses.

```text
We are working in the Freediving Philippines repository.

Execute only this initiative when reached in the canonical sequence:

.ai/initiatives/mobile-web-parity/16-navigation-deep-linking-platform-hardening.md

Goal:
Harden mobile navigation, deep links, auth gates, notification targets, placeholders, and platform contracts across implemented parity surfaces.

Do not:
- Start new product features here.
- Use this phase as a substitute for unfinished surface parity.
- Run Android emulator or physical-device tests unless the initiative explicitly requires Android-specific behavior.
- Skip required iOS Simulator smoke testing without documenting the command, blocker, and manual checklist.

Verification:
- Navigation/deep-link route tests where possible.
- Notification target routing tests where possible.
- Mobile type-check.
- git diff --check.

Update initiative and state.

Final response:
Verdict, summary, files changed, checks, remaining gaps, manual smoke checklist.
```

### 17 Final Parity Audit And Release Gate

Dependency gate: execute automatically after every prior initiative has a terminal passing or accepted status, or is explicitly documented as blocked/decision-gated.

```text
We are working in the Freediving Philippines repository.

Execute only this initiative when reached in the canonical sequence:

.ai/initiatives/mobile-web-parity/17-final-parity-audit-and-release-gate.md

Goal:
Run the final mobile-web parity audit with static verification and required iOS Simulator smoke testing and produce the release gate report.

Do not:
- Implement new features.
- Run Android emulator or physical-device tests unless the initiative explicitly requires Android-specific behavior.
- Skip required iOS Simulator smoke testing without documenting the command, blocker, and manual checklist.
- Paper over skipped verification.

Verification:
- Re-run web/mobile route inventory.
- Re-run feature parity matrix against current code.
- Confirm all initiative statuses and reports.
- Mobile type-check if source changed during any final cleanup.
- git diff --check.

Update initiative and state.

Final response:
Verdict, summary, files changed, checks, remaining gaps, release recommendation.
```

## Full Autonomous Implementation Prompt

```text
We are working in the Freediving Philippines repository.

Execute the full mobile-web parity initiative sequence under:

.ai/initiatives/mobile-web-parity/

This is implementation work, one initiative at a time. Include initiatives marked Ready and Ready After Previous. Do not stop merely because the next initiative depends on the previous one if the previous one is now complete.

Canonical execution order:
1. .ai/initiatives/mobile-web-parity/00-mobile-web-parity-assessment-lock.md
2. .ai/initiatives/mobile-web-parity/01-auth-onboarding-account-setup.md
3. .ai/initiatives/mobile-web-parity/02-profile-core-badges-dive-identity.md
4. .ai/initiatives/mobile-web-parity/03-media-posts-comments-deep-links.md
5. .ai/initiatives/mobile-web-parity/04-chika-forums-parity.md
6. .ai/initiatives/mobile-web-parity/05-messaging-notifications-buddy-relationships.md
7. .ai/initiatives/mobile-web-parity/06-explore-dive-sites-parity.md
8. .ai/initiatives/mobile-web-parity/07-groups-parity.md
9. .ai/initiatives/mobile-web-parity/08-events-attendee-parity.md
10. .ai/initiatives/mobile-web-parity/10-schools-public-courses-bookings.md
11. .ai/initiatives/mobile-web-parity/12-instructor-application-profile-parity.md
12. .ai/initiatives/mobile-web-parity/13-saved-search-learn-guides.md
13. .ai/initiatives/mobile-web-parity/14-user-safety-report-block.md
14. .ai/initiatives/mobile-web-parity/16-navigation-deep-linking-platform-hardening.md
15. .ai/initiatives/mobile-web-parity/09-events-organizer-management-parity.md
16. .ai/initiatives/mobile-web-parity/11-school-management-parity.md
17. .ai/initiatives/mobile-web-parity/15-admin-moderation-mobile-triage.md
18. .ai/initiatives/mobile-web-parity/17-final-parity-audit-and-release-gate.md

Read first:
- .ai/README.md
- .ai/core/project-brief.md
- .ai/core/architecture-rules.md
- .ai/core/product-rules.md
- .ai/core/conventions.md
- .ai/state/current-state.md
- .ai/initiatives/mobile-web-parity/README.md
- .ai/initiatives/mobile-web-parity/execution-prompts.md
- the current initiative file before starting each initiative
- relevant web, mobile, shared type, and backend source for that initiative

Execution rules:
- If an initiative is Done, verify its report/status and move to the next initiative.
- If an initiative is Ready, execute it.
- If an initiative is Ready After Previous and all earlier canonical initiatives are Done, passed, passed_with_issues, or explicitly accepted, execute it.
- After each initiative passes verification, update its status to Done, update .ai/state/current-state.md, and record handoff notes/manual smoke checklist.
- If local .ai conventions require an active/current marker, update the next Ready After Previous initiative to the active/current state when starting it.
- Preserve mobile draft/outbox behavior where it already exists.
- Use shared contracts from packages/types when they exist. Do not create mobile-local DTOs for shared API contracts.
- Keep backend and services/fphgo as canonical business truth.
- Do not bypass auth, privacy, block, moderation, payment, booking, school, instructor, event role, or admin policy.
- Run static/code-wise verification.
- Run iOS Simulator smoke testing for initiatives that affect mobile UI, navigation, auth flow, deep links, media flows, forms, uploads, permission flows, or user-facing screens.
- Always run iOS Simulator smoke testing during the final parity audit.
- Do not run Android emulator or physical-device tests unless explicitly required.
- Do not falsely claim simulator verification passed if it was skipped or blocked.

Stop only on:
- Status: Blocked.
- Unresolved Decision-Gated initiative with no safe limited scope.
- hard backend/shared contract conflict.
- auth, privacy, safety, destructive-action, or source-of-truth ambiguity.
- broad unrelated verification failure that makes safe implementation impossible.
- iOS Simulator smoke reveals a runtime crash, broken navigation, auth loop, persistent redbox, severe UI regression, or code-caused runtime failure.

Do not stop on:
- ordinary sequence dependency once the previous initiative is complete.
- large but scoped implementation work.
- placeholders that need replacement inside the current initiative scope.
- iOS Simulator failure caused by unrelated local environment/toolchain/simulator availability when static verification passed and a manual smoke checklist is provided. Mark this PASS WITH ISSUES unless there is a code-level blocker.

Verification per initiative:
- Run the initiative's targeted tests/checks.
- Run mobile type-check when available and relevant.
- Run shared type tests if shared contracts changed.
- Run web type-check if shared contracts changed.
- Run backend tests only if backend changed.
- Run iOS Simulator smoke testing when the initiative affects mobile UI/navigation/runtime behavior.
- Always run iOS Simulator smoke testing during final audit.
- Always run git diff --check.
- Do not run app-wide tests unless the initiative explicitly requires them or targeted verification is insufficient.
- If simulator testing cannot be run, report the exact command, failure reason, whether the cause is code, dependency/toolchain, signing, simulator availability, or environment, whether static verification still passed, and the manual smoke checklist.

Final report:
Produce a final PASS / PASS WITH ISSUES / BLOCKED report with:
1. Verdict
2. Initiatives completed
3. Files changed
4. Tests/checks
5. Remaining gaps
6. Manual smoke checklist
7. Next recommended action
```
