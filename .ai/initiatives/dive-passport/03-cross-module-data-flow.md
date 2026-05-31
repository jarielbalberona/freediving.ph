# Dive Passport Cross-Module Data Flow

## Aggregate Read Flow

1. Web profile route requests a user's Passport aggregate.
2. Shared request/response contracts live in `packages/types/src/api`.
3. Backend Passport or profile handler resolves viewer identity and target profile identity.
4. Passport service loads the target profile summary.
5. Passport service reads available child systems:
   - Dive Map / `user_dive_sites` for map preview and visited-site stats.
   - Profile Badges for badges, PBs, certifications, roles, auto stats, and existing verification indicators.
   - Dive Journey for highlights.
   - Dive Memories / media posts for recent social/media sections when available.
6. Passport service applies profile and child resource visibility filtering.
7. Passport service returns a composed aggregate DTO.
8. Web renders the Passport section/page/tab without calculating source truth client-side.
9. No write flows run against Dive Map, Dive Journey, Badges, certifications, media, memories, or stats.

## Settings Flow

1. Authenticated owner updates Passport presentation settings if Phase 4 implements settings.
2. Backend validates ownership and settings shape.
3. Repository stores only presentation preferences in `passport_settings`.
4. Settings affect section display/order only.
5. Settings do not create, mutate, duplicate, or verify source records.

## Dive Map Boundary

Passport may read Dive Map preview data from `user_dive_sites` or an existing Dive Map API/service.

Forbidden:

- Unlocking Dive Map locations.
- Increasing visited-site counts.
- Creating or mutating `user_dive_sites`.
- Inferring visited sites from Passport settings, Journey entries, memories, or badges.
- Creating reverse dependency from Dive Map to Passport.

## Dive Journey Boundary

Passport may read Journey highlights from Dive Journey if implemented.

Forbidden:

- Creating or mutating Journey entries.
- Treating Journey entries as proof.
- Treating Passport featured sections as Journey source data.
- Creating Journey entries from Passport reads or settings.

## Badge Boundary

Passport may read badge showcase data from Profile Badges.

Forbidden:

- Awarding badges.
- Verifying badges or credentials.
- Recalculating badge stats.
- Duplicating badge records into Passport-owned storage.
- Creating reverse dependency from Badge awarding/verification to Passport.

## Recent Memories / Media Boundary

Passport may read recent memories/media from existing systems.

Forbidden:

- Duplicating source records.
- Reinterpreting memories/media as proof unless the child system already exposes them as proof.
- Ignoring child resource visibility.

## Fallback Flow

When a child system is unavailable, unimplemented, private, or empty:

1. Passport aggregate returns a stable empty section or omits the section according to contract.
2. Web renders an empty state without implying a verified absence of activity.
3. Passport does not synthesize fake stats or placeholder achievements.
