# Phase 2 Report: Passport Aggregate Contract Design

## Final Status

passed

## Aggregate DTO Design

Proposed shared contract names:

- `ProfilePassportResponse`
- `ProfilePassport`
- `PassportSectionState`
- `PassportSummary`
- `PassportStats`
- `PassportMapPreview`
- `PassportBadgeShowcase`
- `PassportJourneyHighlights`
- `PassportRecentMedia`
- `PassportSettings`

Draft shape:

```ts
type PassportSectionStatus = "ready" | "empty" | "unavailable" | "hidden";

type PassportSectionState = {
  status: PassportSectionStatus;
  reason?: "new_profile" | "no_data" | "source_unavailable" | "viewer_not_allowed" | "settings_hidden";
};

type ProfilePassportResponse = {
  passport: ProfilePassport;
};

type ProfilePassport = {
  profile: ProfileView;
  summary: PassportSummary;
  stats: PassportStats;
  mapPreview: PassportMapPreview;
  badgeShowcase: PassportBadgeShowcase;
  journeyHighlights: PassportJourneyHighlights;
  recentMedia: PassportRecentMedia;
  memories: PassportSectionState;
  settings: PassportSettings;
};
```

## Section Design

`PassportSummary`

- Source: profile read model.
- Fields: `displayName`, `username`, `avatarUrl`, `locationText`, `memberSince`, optional short `bio`.
- Fallback: use profile minimum fields; omit optional fields.

`PassportStats`

- Source: child system counts only.
- Fields: `visitedSiteCount`, `badgeCount`, `journeyEntryCount`, `mediaPostCount`, `memoryCount`.
- Fallback: zero counts when a source returns empty; `status: unavailable` if the source is missing.
- Forbidden: deriving visited sites from Journey, badges, media, or memories.

`PassportMapPreview`

- Source: Dive Map/profile Dive Map read contracts.
- Fields: `state`, `visitedSiteCount`, up to a small list of `ProfileDiveMapMarker`.
- Fallback: empty state with zero markers/count.

`PassportBadgeShowcase`

- Source: Profile Badges read contracts.
- Fields: `state`, `badges`, `autoStats`, `featuredBadgeIds`.
- Fallback: empty arrays.
- Forbidden: awarding, verifying, mutating, or copying badge source records.

`PassportJourneyHighlights`

- Source: Dive Journey profile read contract.
- Fields: `state`, recent/highlight `JourneyEntry[]`.
- Fallback: empty array.
- Forbidden: creating, hiding, deleting, regenerating, or treating Journey as proof.

`PassportRecentMedia`

- Source: existing profile/media read boundaries.
- Fields: `state`, recent display media/post references.
- Fallback: empty array.
- Forbidden: treating media as map proof unless the Dive Map source already exposed it as proof.

`memories`

- Source: unavailable in V1.
- Fields: `PassportSectionState`.
- Fallback: `status: "unavailable"`, `reason: "source_unavailable"`.

`PassportSettings`

- Source: optional `passport_settings` presentation preferences.
- Fields: `showMap`, `showBadges`, `showJourney`, `showMemories`, `featuredBadgeIds`, timestamps.
- Fallback: all sections visible by default except unavailable child sections.
- Forbidden: child visibility mutation or copied child data.

## Section-To-Source Ownership Map

- Profile summary: Profile.
- Visited-site count: Dive Map / `user_dive_sites`.
- Badge count/showcase: Profile Badges.
- Journey highlights: Dive Journey.
- Recent media: existing media/profile media reads.
- Memories: deferred; no source exists.
- Settings: Passport presentation settings only.

## Visibility Rules

- Profile visibility is the outer gate.
- Dive Map must apply its existing profile map visibility rules.
- Badges must use public badge visibility and never expose private badges to other viewers.
- Journey must use public/followers/private visibility from the Journey read service.
- Media must use existing media/profile visibility.
- Settings may hide Passport sections but must not reveal hidden child data or change child visibility.

## Empty/Fallback Behavior

- New user: profile summary plus empty sections.
- Missing Dive Map: `mapPreview.state.status = "empty"` or `"unavailable"` with zero count.
- Empty Journey: `journeyHighlights.state.status = "empty"`.
- No badges: `badgeShowcase.state.status = "empty"`.
- No media: `recentMedia.state.status = "empty"`.
- No memories: `memories.status = "unavailable"`.

## Rejected Fields

- No Passport-owned credential verification fields.
- No Passport-owned `visitedSites` truth.
- No copied badge rows.
- No copied Journey rows.
- No copied media/memory rows.
- No `dive_passports` source-of-truth table.

## Verification Commands and Results

- `git diff -- .ai/initiatives/dive-passport`: passed; documentation diff reviewed.
- `rg "dive_passports|source of truth|presentation|fallback|visibility" .ai/initiatives/dive-passport`: passed; source-truth, presentation, fallback, and visibility language reviewed.

## Repairs Attempted

- None.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/verification-status.md`

## Risks and Limitations

- Featured badge IDs are safe only as references to existing badge records. Any richer curation rules need a product decision.
- Memories remain unavailable.
- The actual shared TypeScript contract is intentionally deferred to Phase 5.

## Next Phase Readiness

Ready for Phase 3: Backend Aggregate Read API.
