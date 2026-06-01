# 13 Saved, Search, Learn, And Guides

Status: passed
Ready for execution: yes
Execution started: yes
Execution completed: yes
Completed date: 2026-06-01
Verdict: PASS
Dependency gate: execute automatically after prior initiatives in the canonical sequence have terminal passing statuses; implement only supported saved/search/learn surfaces with existing contracts or clearly scoped native content.

## Readiness Rationale

This is sequence-gated, not blocked. Saved surfaces and several domain search/content entry points can be implemented from existing contracts. Execution must not invent a broad global search contract; if no safe contract exists for a sub-scope, document that sub-scope as a gap and continue with supported parity.

## 1. Purpose

Plan the remaining utility and discovery surfaces: saved hub, search, learn/guides, founder note, and public content parity.

## 2. Scope

- Saved hub for saved sites/users/media if supported.
- Mobile search implementation.
- Learn/guides route replacing placeholder.
- Founder note route replacing placeholder if still desired.
- Public feature/location guide content only where mobile product needs it.
- Deep links from search/saved/learn to product surfaces.

## 3. Explicit Non-Goals

- SEO parity inside mobile.
- Rebuilding web landing pages as native marketing pages.
- Search across entities without a defined backend/query contract.
- Admin/management search.

## 4. Dependencies

- `02-profile-core-badges-dive-identity.md`
- `03-media-posts-comments-deep-links.md`
- `06-explore-dive-sites-parity.md`
- `10-schools-public-courses-bookings.md` if schools are in search.
- Product decision on search scope.

## 5. Files And Areas Likely Involved

- `apps/mobile/app/(app)/(tabs)/search/**`
- `apps/mobile/app/(app)/(tabs)/(home)/learn.tsx`
- `apps/mobile/app/(app)/(tabs)/(home)/founders-note.tsx`
- future `apps/mobile/src/features/search/**`
- future `apps/mobile/src/features/saved/**`
- `apps/web/src/app/saved/page.tsx`
- `apps/web/src/features/public-content/**`
- `apps/web/src/features/profiles/api/profiles.ts`
- `packages/types/src/**`

## 6. Existing Web Source Of Truth

- `/saved`
- `/guides`, `/guides/[slug]`
- `/features/**`
- `/freediving/**`
- `/founder-note`
- user search API in web profiles feature.

## 7. Existing Mobile Implementation Status

Search is a placeholder. Learn and Founder Note are placeholders. No saved hub mobile screen was found.

## 8. Backend/Shared Contract Status

Saved hub and profile search contracts exist. Broader global search contract is unclear and must be defined before implementation.

## 9. Implementation Steps

1. Human confirms search scope: people/sites/Chika/events/groups/schools/media or a subset.
2. Add saved hub using existing saved contracts.
3. Add search API hooks only for confirmed entity contracts.
4. Replace learn/founder placeholders with native content if product wants it.
5. Add deep-link routing from results.
6. Add tests for search/saved empty/loading/error and routing states.

## 10. Role/Auth/Privacy Rules

Saved hub requires auth. Search must respect profile visibility, block rules, content visibility, private groups/events, and moderation-hidden content.

## 11. UX Rules For Native Mobile

Use segmented search scopes and recent/saved patterns. Do not dump SEO article layouts into mobile unless content is genuinely useful in-app.

## 12. Data/Source-Of-Truth Rules

Search results and saved state come from backend APIs. React Query cache is not durable truth.

## 13. Implementation Guards

- Global search remains out of scope until a backend/shared global search contract is defined.
- Stop if any search result would bypass backend visibility.
- Do not hardcode public-content data if backend/search should own it.

## Execution Summary

- Added scoped mobile search for people and dive sites using existing backend contracts only.
- Added authenticated saved hub access through `/v1/me/saved`.
- Added `/saved` mobile route that opens directly to the Saved scope.
- Replaced Learn and Founder Note placeholders with compact native mobile content and links to existing product surfaces.
- Added deep-link resolver support for `/saved`, `/learn`, `/guides`, guide slugs, and `/founder-note`.
- Did not implement broad/global search, SEO article parity, admin/management search, or new backend contracts.

## Verification Result

PASS on 2026-06-01.

- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`
- `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`
- iOS Simulator smoke on iPhone 17 Pro Max with running Expo/Metro:
  - `freediving-ph-app:///(app)/(tabs)/search`
  - `freediving-ph-app:///(app)/(tabs)/(home)/saved`
  - `freediving-ph-app:///(app)/(tabs)/(home)/learn`
  - `freediving-ph-app:///(app)/(tabs)/(home)/founders-note`
  - Screenshots: `/tmp/fph-ios-search-13.png`, `/tmp/fph-ios-saved-13.png`, `/tmp/fph-ios-learn-13.png`, `/tmp/fph-ios-founder-13.png`
- `git diff --check`

## 14. Acceptance Criteria

- Saved hub works for supported saved entity types.
- Search scope is explicit and tested.
- Placeholder learn/founder routes are replaced only where product approved.
- Deep links route to real mobile screens.

## 15. Verification Commands

- `pnpm --filter @freediving.ph/mobile test`
- `pnpm --filter @freediving.ph/mobile type-check`
- `pnpm --filter @freediving.ph/types test` if contracts change
- `git diff --check`

### iOS Simulator Smoke Test

Required when this initiative changes mobile UI/navigation/runtime behavior.

Suggested flow:
1. Launch the mobile app in an iOS Simulator using the repo-supported command.
2. Confirm the app opens without redbox/runtime crash.
3. Navigate to each screen changed by this initiative.
4. Confirm loading, empty, error, and success states where practical.
5. Confirm primary actions open the expected sheet/screen/form.
6. Confirm back navigation works.
7. Confirm there are no obvious layout breaks on a standard iPhone simulator.
8. Record simulator/device, command used, result, and any runtime errors.

If simulator testing cannot be run, document the blocker and include a manual checklist.

## 16. Manual Smoke Checklist

- Save and unsave supported entities.
- Search each approved scope.
- Open search results.
- Open guide/founder content if implemented.

## 17. Rollback/Risk Notes

Rollback saved/search/learn mobile routes/modules. Risks are privacy leaks through search and low-value content clutter.

## 18. Handoff Notes For The Next Initiative

Safety/report/block should be completed before broad search release if search exposes user-generated content.
