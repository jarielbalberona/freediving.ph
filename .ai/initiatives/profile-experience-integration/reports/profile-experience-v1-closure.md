# Profile Experience V1 Closure

Date: 2026-05-31

## Verdict

CLOSED WITH ISSUES

The profile experience V1 initiatives are closed for the implemented scope. The remaining issues are known and deferred, not blockers for closure:

- Dive Memories/tagged-user privacy is not specified or implemented.
- Profile UI density/polish needs product review after real content grows.
- Repo-level `pnpm test` remains polluted by unrelated mobile `@expo/ui` dependency drift.
- Map milestone and badge producer catalogs are not implemented yet.

## Source Reports Reviewed

- `.ai/initiatives/user-dive-map/reports/final-report.md`
- `.ai/initiatives/dive-journey/reports/final-report.md`
- `.ai/initiatives/dive-passport/reports/final-report.md`
- `.ai/initiatives/profile-experience-integration/reports/final-report.md`

## Final Feature Inventory

### Profile Badges

- User-created badges and auto stats remain the achievement, credential, and stat layer.
- Public profile badges surface remains available through the profile badge API and `ProfileBadges` web component.
- Dive Sites Visited auto-stat is aligned to `user_dive_sites`.
- The legacy Profile Badges fallback that counted raw `media_posts.dive_site_id` was removed during integration hardening.
- Future map-origin badges must source from Dive Map read-model truth, not media shortcuts, Journey entries, Passport state, or memories.

### User Dive Map

- User Dive Map V1 is implemented as a proof-based profile experience.
- `user_dive_sites` is the canonical read model for visited/unlocked dive sites.
- A dive site unlocks only from a qualifying user-owned `media_posts` record tagged to `dive_site_id`.
- Profile Dive Map APIs expose map markers, visited-site count, and per-site proof media.
- V1 marker details show only the target user's own qualifying media posts.
- Shared/tagged memories do not unlock locations, inflate counts, or appear in marker details.

### Dive Journey

- Dive Journey is implemented as the downstream profile storytelling timeline.
- It supports manual owner entries, owner media attachments, generated-entry helpers, and generated-entry hide/archive behavior.
- Journey entries may contain `dive_site_id` as storytelling context only.
- Journey must not unlock Dive Map locations, inflate visited-site counts, award badges, verify credentials, or feed Passport stats as a source of truth.
- Tagged-user Journey behavior remains deferred pending a locked privacy/tagging policy.

### Dive Passport

- Dive Passport is implemented as a read-only aggregate/presentation layer.
- The Passport aggregate composes profile, map preview, badge showcase, Journey highlights, recent media, memories state, stats, and presentation settings.
- Passport settings are presentation preferences only.
- Passport does not create a `dive_passports` source-of-truth table and does not mutate badges, map, Journey, profile source data, media, memories, credentials, certifications, or source stats.
- Memories remain unavailable/deferred in Passport V1.

## Final Data-Flow Summary

1. User-owned qualifying media posts tagged to `dive_site_id` drive `user_dive_sites`.
2. `user_dive_sites` drives profile Dive Map markers, visited-site count, and Dive Sites Visited badge/stat truth.
3. Profile Badges reads achievement/credential/stat data and may reference `dive_map` sources, but must not calculate competing visited-site truth.
4. Dive Journey consumes manual entries and future generated milestones as display/storytelling rows. It remains downstream of source systems.
5. Dive Passport reads Profile, Dive Map, Badges, Journey, media, and deferred memory state through child boundaries and presents an aggregate.
6. Public profile web composition renders badges plus the Diving tab modules without calculating source truth in the browser.

## Source-Of-Truth Rules

- Dive Map owns visited-site proof through `user_dive_sites`.
- A visited site requires a qualifying user-owned media post tagged to `dive_site_id`.
- Shared/tagged memories are not proof and must not affect map unlocks or counts.
- Profile Badges owns badge/achievement/credential/stat presentation, but not dive-site truth.
- Journey owns storytelling timeline entries only.
- Journey entries with site context are not proof.
- Passport owns no source data; it is a composed read model and presentation layer.
- Passport settings cannot mutate child visibility, child stats, badges, map rows, Journey entries, or source records.

## API/DTO Summary

### Profile Badges

- `GET /v1/profiles/{username}/badges`
- `GET /v1/me/badges`
- `POST /v1/me/badges`
- `PATCH /v1/me/badges/{badgeID}`
- `DELETE /v1/me/badges/{badgeID}`
- Shared DTOs: `BadgeTemplate`, `UserBadge`, `ProfileBadgesResponse`, `UpsertUserBadgeRequest`.

### User Dive Map

- `GET /v1/profiles/{username}/dive-map`
- `GET /v1/profiles/{username}/dive-map/{siteID}`
- Shared DTOs: `ProfileDiveMapMarker`, `ProfileDiveMapProofMedia`, `ProfileDiveMapResponse`, `ProfileDiveMapSiteResponse`.

### Dive Journey

- `GET /v1/profiles/{username}/journey`
- `POST /v1/me/journey`
- `PATCH /v1/me/journey/{entryID}`
- `DELETE /v1/me/journey/{entryID}`
- Shared DTOs: `JourneyEntry`, `ProfileJourneyResponse`, `JourneyEntryResponse`, `CreateManualJourneyEntryRequest`, `UpdateManualJourneyEntryRequest`, `HideJourneyEntryRequest`.

### Dive Passport

- `GET /v1/profiles/{username}/passport`
- `GET /v1/me/passport/settings`
- `PUT /v1/me/passport/settings`
- Shared DTOs: `ProfilePassport`, `ProfilePassportResponse`, `PassportSettings`, `PassportSettingsResponse`, `UpdatePassportSettingsRequest`.

## UI Surfaces Added

- `ProfileBadges` remains on the profile page as the badge/achievement surface.
- `ProfileDiveMap` is shown in the profile Diving tab as a V1 dense section/list with selected-site proof media.
- `ProfileJourney` is shown in the profile Diving tab for owner create/delete and visible timeline display.
- `ProfilePassport` is shown in the profile Diving tab as an aggregate profile showcase with owner presentation settings.
- Existing Dive Presence and Dive Sites sections remain in the Diving tab below Passport, Dive Map, and Journey.

## Verification Summary

### User Dive Map

- Final status: passed.
- Targeted Go, sqlc, migration, shared type, web, repo typecheck/lint/test/build, and diff checks passed.
- Local migrations reached version 84 during the initiative.

### Dive Journey

- Final status: pass with issues.
- Targeted Go, shared type, web, repo typecheck/lint/test/build, and diff checks passed.
- Issue: tagged-user Journey behavior deliberately deferred.

### Dive Passport

- Final status: pass with issues.
- Targeted Passport backend, migrations, sqlc, route, shared type, web, typecheck/lint/build, and diff checks passed.
- Local migrations reached version 86.
- Issue: repo-level `pnpm test` failed only because unrelated mobile `@expo/ui` drift expected `~56.0.14` while dirty state had `~56.0.15`.

### Profile Experience Integration

- Final status: pass with issues.
- Targeted profile, Dive Map, Journey, Passport, app route, shared type, web, Go, repo typecheck/lint/build, and diff checks passed.
- Issue: repo-level `pnpm test` remains blocked by unrelated mobile `@expo/ui` drift.

## Known Risks

- `user_dive_sites` derivation must be called by any future profile media edit/delete/retag flows.
- `user_dive_sites.first_post_id` and `last_post_id` use `ON DELETE RESTRICT`; hard-delete flows must recompute/remove rows first.
- Map visibility currently follows existing profile diving visibility semantics; map-specific privacy requires a separate locked decision.
- Dive Memories/tagged-user sharing remains unavailable and must not be inferred into Map, Journey, Passport, or Badges.
- Journey generated-entry producers do not exist yet.
- Future map milestone producers need locked rules and must derive only from `user_dive_sites`.
- Passport depends on child readers for visibility; child-reader regressions can affect Passport output.
- Profile UI density may become a product issue as real content grows.
- Mobile profile experience was not implemented.
- Repo-level `pnpm test` is not clean until unrelated mobile Expo dependency drift is resolved.
- No emulator, device, or manual browser UX smoke tests were run by instruction.

## Deferred Initiatives

1. `dive-memories`
   - Define memory schema, media, tagged users, ownership, tag acceptance/decline, blocking, privacy, visibility, authorization, and allowed display in Map/Journey/Passport.
2. `dive-map-milestone-producers`
   - Define map milestone catalog and Journey generated-entry producers sourced from `user_dive_sites`.
3. `profile-experience-ux-density`
   - Decide whether Passport and source sections stay together in the Diving tab or split into a separate route/tab.
4. `mobile-dependency-drift-cleanup`
   - Resolve `@expo/ui` drift so repo-level `pnpm test` becomes a clean gate again.
5. `mobile-profile-experience`
   - Implement mobile equivalents only after product scope is locked.

## Manual Review Checklist

- Review a real public profile with badges, map markers, Journey entries, and Passport populated.
- Review anonymous, signed-in non-owner, and owner visibility across Badges, Map, Journey, and Passport.
- Confirm Dive Sites Visited values against `user_dive_sites`.
- Confirm map marker details show only owner-owned qualifying media posts.
- Confirm no shared/tagged memories appear in map markers or inflate counts.
- Review Passport owner settings with real authenticated data.
- Review Diving tab density on mobile and desktop viewports.
- Fix or explicitly accept mobile `@expo/ui` dependency drift before treating repo-level `pnpm test` as clean.

## Recommended Next Work

Recommended next initiative: `dive-memories`.

Reason: it is the only major product gap blocking safe shared/tagged memory integration across Dive Map, Journey, Passport, and the broader profile experience. Do not bolt memories into existing modules until ownership, tagging, acceptance/decline, blocking, visibility, and authorization are locked.

Secondary work after that:

- `dive-map-milestone-producers`
- `profile-experience-ux-density`
- `mobile-dependency-drift-cleanup`
- `mobile-profile-experience`

## Closure Confirmation

- Closure audit only.
- No implementation phase was started.
- No new feature code was added.
- No backend, frontend, shared contract, migration, or mobile code was modified by this closure report.
