# Phase 1 Report: Discovery And Dependency Alignment

## Final Status

passed

## Available Child Systems

- Profile: backend profile service/repository/HTTP routes exist under `services/fphgo/internal/features/profiles`; web profile feature exists under `apps/web/src/features/profile` and `apps/web/src/features/profiles`.
- Profile Badges: backend reads and writes exist in the profile feature; shared contracts exist in `packages/types/src/api/badges.ts`; web APIs/hooks/components exist.
- Dive Map: proof-based `user_dive_sites` read model exists; profile Dive Map read APIs and shared contracts exist; web profile Dive Map UI exists.
- Dive Journey: read/write backend module exists under `services/fphgo/internal/features/dive_journey`; shared contracts exist in `packages/types/src/api/dive-journey.ts`; web profile Journey UI exists.
- Media: profile/media APIs and media feature modules exist; Passport can read display media only through existing profile/media boundaries.
- Memories: no `dive_memories` module exists. Treat memories as empty/deferred in Passport V1.

## Missing Dependencies

- Dive Memories and tagged-user memory privacy are not implemented.
- No dedicated Passport backend feature package exists yet.
- No Passport shared contract exists yet.
- No Passport web UI exists yet.

## Backend Package Boundary

Use a new backend feature package:

- `services/fphgo/internal/features/dive_passport`

Reason: Passport is a composed aggregate over multiple source modules. Putting it inside `profiles` would make the already large profile feature own cross-module aggregation and increase the risk of Passport becoming source truth.

Allowed direction:

- Passport reads Profile, Profile Badges, Dive Map, Dive Journey, media, and later memories.

Forbidden direction:

- Profile, Badges, Dive Map, Journey, media, or memories must not depend on Passport.

## Settings Decision

Optional settings can proceed only as low-risk presentation preferences:

- `show_map`
- `show_badges`
- `show_journey`
- `show_memories`
- references to existing badge IDs for featured/order presentation

Hard limits:

- Settings must not change child visibility.
- Settings must not store copied badge/map/journey/media/memory records.
- Settings must not mutate badges, map, journey, profile, media, memories, credentials, certifications, or stats.
- Any richer featured-badge product behavior must hard-stop.

## Empty-State And Fallback Plan

- New profile: return profile summary with empty sections.
- Missing Dive Map: return an empty map preview and `visitedSiteCount: 0`; do not infer from Journey, badges, or media.
- Empty Dive Map: return empty markers and zero count from the map source.
- Missing Journey: return an empty Journey highlights section.
- Empty Journey: return an empty Journey highlights section.
- Missing badges: return empty badge showcase and badge count.
- No memories: return empty/deferred memories section.
- No media: return empty media section.

## Read-Only Confirmation

Execution can proceed without creating Passport-owned source data. Passport V1 must remain a read-only aggregate/presentation layer. No `dive_passports` source-of-truth table is needed.

## Verification Commands and Results

- `git status --short`: passed; showed existing Dive Journey final-report/state edits.
- `rg "badge|passport|journey|user_dive_sites|visibility|profile|media|memory" services/fphgo packages/types apps/web .ai/initiatives`: passed; output reviewed.
- `find services/fphgo/internal/features -maxdepth 2 -type d | sort`: passed; output reviewed.
- `find apps/web/src/features -maxdepth 2 -type d | sort`: passed; output reviewed.

## Repairs Attempted

- None. Phase 1 is read-only discovery.

## State Files Updated

- `.ai/state/current-state.md`
- `.ai/state/known-risks.md`
- `.ai/state/verification-status.md`

## Risks and Limitations

- Memories are not available and must not be guessed into Passport.
- Settings are only safe if presentation-only.
- Passport aggregation must not create reverse dependencies or source-data duplication.

## Next Phase Readiness

Ready for Phase 2: Passport Aggregate Contract Design.
