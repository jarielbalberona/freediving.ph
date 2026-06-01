# 13 Saved, Search, Learn, And Guides Report

Date: 2026-06-01
Verdict: PASS

## Summary

Mobile now has scoped saved/search/learn parity for the backend-supported surfaces in this initiative. Search is intentionally limited to people and dive sites, because those have existing shared/backend contracts. Saved uses the authenticated saved hub contract. Learn and Founder Note placeholders were replaced with compact native content rather than web SEO page copies.

## Implemented

- People search using `/v1/users/search`.
- Dive-site search using `/v1/explore/sites`.
- Authenticated saved hub using `/v1/me/saved`.
- `/saved` route that opens directly to saved items.
- Learn and Founder Note native screens.
- Deep-link resolution for saved, learn, guides, guide slugs, and founder note routes.
- Focused tests covering contracts, routing, and placeholder replacement.

## Not Implemented

- Broad/global search across all product entities.
- Chika/events/groups/schools/media search, because no single safe global contract was introduced in this initiative.
- SEO/mobile article parity for every web guide.
- Admin/management search.

## Verification

- PASS: `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile test`
- PASS: `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile type-check`
- PASS: `/opt/homebrew/bin/pnpm --filter @freediving.ph/mobile lint`
- PASS: iOS Simulator smoke on iPhone 17 Pro Max with running Expo/Metro.
- PASS: `git diff --check`

## iOS Smoke Evidence

- Search: `/tmp/fph-ios-search-13.png`
- Saved: `/tmp/fph-ios-saved-13.png`
- Learn: `/tmp/fph-ios-learn-13.png`
- Founder Note: `/tmp/fph-ios-founder-13.png`

## Manual Smoke Checklist

- Open Search tab and confirm People, Dive sites, and Saved scopes render.
- Search at least one diver and open a result profile.
- Search at least one dive site and open a result detail page.
- Open Saved from the Home stack and confirm it starts on the Saved scope.
- Open Learn and confirm community tool buttons route to Explore, Schools, and Buddy Finder.
- Open Founder Note and confirm content renders without layout overlap.

## Remaining Gaps

- Broader search needs a product/API decision and backend/shared contract.
- Learn content is intentionally compact native guidance; full SEO guide parity remains web-owned.
- Saved hub only exposes entity types supported by the current shared saved contract.

## Handoff

Next recommended target is `14-user-safety-report-block.md`, because broader discovery/search surfaces should be followed by safety/report/block hardening before expanding user-generated content exposure further.
