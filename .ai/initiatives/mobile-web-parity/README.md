# Mobile-Web Parity Initiative Set

Status: locked
Ready for execution: partial
Execution started: yes
Latest execution status: Clerk test user role QA is PASS WITH ISSUES as of 2026-06-01. Code-wise mobile verification is green, initiatives 01-05 have retroactive iOS Simulator route smoke, seeded local simulator mutations passed for messaging/event/group/Chika, and Clerk-backed QA identities now exist for the role matrix. Public release still needs the rest of the role accounts and mutation-heavy flows simulator-smoked.

## Purpose

Plan the complete mobile-web product-surface parity program between `apps/web` and `apps/mobile` without implementing application code. Each file in this directory is a separately reviewable initiative slice with its own scope, dependencies, acceptance criteria, verification commands, smoke checklist, and PASS/PASS WITH ISSUES/BLOCKED criterion.

## Source Inputs

- `.ai/core/*`
- `.ai/state/current-state.md`
- `docs/mobile-web-parity-assessment.md`
- `apps/web/src/app/**`
- `apps/web/src/features/**`
- `apps/mobile/app/**`
- `apps/mobile/src/features/**`
- `packages/types/src/**`
- `services/fphgo/internal/features/**`

## Global Guardrails

- Backend and database state remain canonical. Mobile must not invent business truth in React Query, Zustand, local drafts, or route params.
- Shared DTOs belong in `packages/types/src`; do not introduce mobile-local copies when a shared contract exists.
- Do not bypass backend auth, privacy, block, moderation, payment, booking, school, instructor, or event role rules.
- Do not count placeholder screens as implemented.
- Preserve existing mobile draft/outbox behavior where it exists.
- Prefer native mobile UX over direct web layout copying.
- Static/code-wise verification is always required.
- iOS Simulator smoke testing is required for initiatives that change mobile UI, navigation, auth flow, deep links, media flows, forms, uploads, permission flows, admin/management mobile screens, or user-facing screens.
- iOS Simulator smoke testing is required for the final parity audit.
- Android emulator testing remains optional unless an initiative explicitly requires Android-specific behavior.
- If iOS Simulator testing is unavailable or blocked by local machine setup, toolchain, signing, simulator availability, or environment, document the exact command, failure reason, classification, static verification result, and manual smoke checklist. Do not claim simulator verification passed when it was skipped or blocked.
- Management/admin surfaces are parity surfaces, but execution must be gated by stricter role, auth, destructive-action, and product-readiness checks.
- Dive Map is proof-based: only a user's own qualifying media post tagged to a dive site unlocks/owns that Dive Map location. Tagged/shared memories alone must not unlock sites or inflate visited-site counts.

## Readiness Model

- `Ready`: can be executed immediately.
- `Ready After Previous`: execute automatically once earlier initiatives in the canonical sequence have terminal passing or accepted statuses. This is not blocked.
- `Decision-Gated`: stop unless the initiative defines a safe limited scope that avoids the unresolved decision.
- `Blocked`: stop and ask for intervention because there is a hard blocker such as a missing backend contract with no safe fallback, contradictory source-of-truth rules, auth/privacy/safety conflict, broken repo state, or an uncreatable prerequisite.
- `Done`: completed and verified.
- `PASS WITH ISSUES`: static checks passed, but required iOS Simulator smoke was blocked by environment/toolchain or found non-blocking UI issues that are documented with a manual smoke checklist.

Dependency-gated initiatives remain part of autonomous execution. The autonomous runner must not stop after `01` merely because later initiatives depend on it. The goal is full 1:1 product-surface parity using native mobile UX, not only the safest first initiative.

## Verification Policy

Static/code-wise checks are always required:

- mobile type-check
- targeted mobile tests
- shared type tests if shared contracts changed
- web type-check if shared contracts changed
- Go/backend tests if backend code changed
- `git diff --check`

iOS Simulator smoke testing is required when an initiative changes:

- mobile routes
- tabs/navigation
- auth/onboarding
- profile screens
- media screens/composer/viewer
- Chika screens
- messaging/notifications
- Explore screens
- groups/events/schools/instructors screens
- forms
- upload flows
- deep links
- permission flows
- admin/management mobile screens

iOS Simulator smoke testing should cover:

- app launch
- sign-in/session state if a test account is available
- tab navigation
- changed screens render without crash
- primary action buttons are reachable
- forms open and validate
- detail routes open
- back navigation works
- loading/error/empty states do not break layout
- no obvious broken layout on a standard iPhone simulator
- no persistent redbox/runtime crash
- no repeated obvious console error caused by the change

The agent must inspect the repo first and use the correct project scripts. Suggested commands to evaluate include:

- `pnpm --filter @freediving.ph/mobile ios`
- `pnpm -C apps/mobile ios`
- `pnpm -C apps/mobile expo run:ios`
- `npx expo run:ios`
- existing repo scripts from `apps/mobile/package.json`

For Expo work, prefer the repo-defined script, use simulator target only, reuse a prior native build if appropriate, and do not alter signing/capability settings unless the initiative explicitly requires it.

If the simulator command fails, the agent must report:

- exact command run
- failure reason
- whether failure is caused by code, dependency/toolchain, signing, simulator availability, or environment
- whether static verification still passed
- manual smoke checklist for the user
- whether the initiative should be `PASS WITH ISSUES` or `Blocked`

Status rules:

- `Done`: static checks passed and required iOS Simulator smoke passed, or simulator was unavailable for documented environment reasons and a manual checklist was provided with no code-level blockers found.
- `PASS WITH ISSUES`: static checks passed but simulator smoke was blocked by environment or found non-blocking UI issues.
- `Blocked`: simulator smoke finds a runtime crash, broken navigation, auth loop, severe UI regression, or code-caused runtime failure.

## Dependency Order

1. `00-mobile-web-parity-assessment-lock.md`
2. `01-auth-onboarding-account-setup.md`
3. `02-profile-core-badges-dive-identity.md`
4. `03-media-posts-comments-deep-links.md`
5. `04-chika-forums-parity.md`
6. `05-messaging-notifications-buddy-relationships.md`
7. `06-explore-dive-sites-parity.md`
8. `07-groups-parity.md`
9. `08-events-attendee-parity.md`
10. `10-schools-public-courses-bookings.md`
11. `12-instructor-application-profile-parity.md`
12. `13-saved-search-learn-guides.md`
13. `14-user-safety-report-block.md`
14. `16-navigation-deep-linking-platform-hardening.md`
15. `09-events-organizer-management-parity.md`
16. `11-school-management-parity.md`
17. `15-admin-moderation-mobile-triage.md`
18. `17-final-parity-audit-and-release-gate.md`

## Summary Table

| # | Initiative | Purpose | Readiness | Dependencies | Decision Gate |
|---|---|---|---|---|---|
| 00 | Assessment Lock | Lock the parity evidence and sequence. | Done | none | no |
| 01 | Auth, Onboarding, Account Setup | Let new mobile users complete required setup and let complete users bypass onboarding. | Ready | 00 | only if required fields are ambiguous during execution |
| 02 | Profile Core, Badges, Dive Identity | Add core mobile profile identity, read-only badges, and compact dive identity summaries. | Ready After Previous | 01; completed profile experience initiatives | no |
| 03 | Media Posts, Comments, Deep Links | Add media detail routes, social actions, comments, saves, viewer, and links. | Ready After Previous | 01; preferably 02 | no |
| 04 | Chika Forums | Add category-aware Chika browsing/detail/create/reply/vote reliability. | Ready After Previous | 01 | no |
| 05 | Messaging, Notifications, Buddy Relationships | Add bilateral buddy relationship UI/API, messaging entry, and notification routing. | Ready After Previous | 01; preferably 02 | no |
| 06 | Explore And Dive Sites | Add mobile Explore list/detail/action/submission parity. | Ready After Previous | 01; 05 if buddy message actions included | no |
| 07 | Groups | Add group discovery/detail/membership/posts/create/light management parity. | Ready After Previous | 01; 03 if group images included; 14 if reports included | no |
| 08 | Events Attendee | Add attendee-facing event parity without organizer management. | Ready After Previous | 01; 03 if proof upload included | no |
| 10 | Schools Public, Courses, Bookings | Add public school/course/booking/my-bookings parity. | Ready After Previous | 01; 03 if proof upload included | no |
| 12 | Instructor Application/Profile | Add instructor application/profile/certification parity. | Ready After Previous | 01; 10 if public profiles used | no |
| 13 | Saved, Search, Learn, Guides | Add saved hub and supported search/learn parity. | PASS | 02, 03, 06, optional 10 | unsupported sub-scopes documented as gaps |
| 14 | User Safety, Report, Block | Add user-facing report/block controls. | PASS | core user surfaces | no moderator/admin actions added |
| 16 | Navigation And Deep Linking | Harden route/deep-link/auth/navigation behavior. | PASS | release-candidate feature set | no |
| 09 | Event Organizer Management | Add mobile organizer management with strict guards. | PASS | 08; 16 | core participant/payment/check-in subset implemented; desktop setup/destructive modules deferred |
| 11 | School Management | Add mobile school owner/admin operations with strict guards. | PASS | 10; 12; 16 | core booking/payment/session workspace implemented; destructive desktop modules deferred |
| 15 | Admin And Moderation Triage | Add mobile moderation/admin triage. | PASS | 14; 16 | triage/status subset implemented; destructive actions remain web-owned |
| 17 | Final Audit And Release Gate | Re-audit final parity and release readiness. | PASS WITH ISSUES | all prior outcomes | accepted smoke/destructive-scope gaps documented |

## Safe To Execute First

- `00` is `Done` and should not be rerun unless the assessment source changes materially.
- `01` is `Ready` and is the current execution target.
- Every `Ready After Previous` initiative is part of autonomous implementation and should run automatically after earlier initiatives in the canonical order finish.
- The runner must stop only on `Blocked`, unresolved `Decision-Gated`, hard contract conflicts, auth/privacy/safety ambiguity, or broad unrelated verification failure.

## Needs Product Decision Before Execution

None at the initiative level after the readiness correction. Individual sub-scopes must still hard-stop if implementation discovers a specific product, destructive-action, auth, privacy, safety, or missing-contract ambiguity.

## Execution Prompts

Reusable prompts for each initiative are locked in `execution-prompts.md`. Use the full autonomous implementation prompt to execute the canonical order. Include initiatives marked `Ready` and `Ready After Previous`; do not stop merely because the next initiative depends on the previous one if the previous one is now complete.

## Filename Aliases

The current repository uses descriptive filenames. The canonical shorthand maps as follows:

- `00-assessment-lock` -> `00-mobile-web-parity-assessment-lock.md`
- `01-auth-onboarding-account` -> `01-auth-onboarding-account-setup.md`
- `02-profile-badges-dive-identity` -> `02-profile-core-badges-dive-identity.md`
- `03-media-posts-social-detail` -> `03-media-posts-comments-deep-links.md`
- `04-chika-forums` -> `04-chika-forums-parity.md`
- `05-messaging-notifications-buddies` -> `05-messaging-notifications-buddy-relationships.md`
- `06-explore-dive-sites` -> `06-explore-dive-sites-parity.md`
- `07-groups` -> `07-groups-parity.md`
- `08-events-attendee` -> `08-events-attendee-parity.md`
- `09-events-organizer` -> `09-events-organizer-management-parity.md`
- `10-schools-courses-bookings` -> `10-schools-public-courses-bookings.md`
- `11-school-management` -> `11-school-management-parity.md`
- `12-instructors` -> `12-instructor-application-profile-parity.md`
- `13-saved-search-learn` -> `13-saved-search-learn-guides.md`
- `14-safety-report-block` -> `14-user-safety-report-block.md`
- `15-admin-moderation` -> `15-admin-moderation-mobile-triage.md`
- `16-navigation-deeplinks-platform` -> `16-navigation-deep-linking-platform-hardening.md`
- `17-final-parity-audit` -> `17-final-parity-audit-and-release-gate.md`
