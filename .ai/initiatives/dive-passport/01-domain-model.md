# Dive Passport Domain Model

## Core Principle

Dive Passport is the public diver identity/showcase layer. It is a composed read model and presentation layer. It must not become a source of truth.

Hard boundaries:

- Dive Map is the proof/location layer.
- Dive Journey is the social/storytelling timeline.
- Profile Badges own badges, PBs, certifications, roles, and auto stats.
- Dive Passport publicly aggregates profile, Dive Map, Badges, Journey, media, memories, and stats for showcase.
- Passport must not unlock Dive Map locations.
- Passport must not increase visited-site counts.
- Passport must not award badges.
- Passport must not verify credentials.
- Passport is soft/social showcase for now, not formal verification.
- Do not create a primary `dive_passports` source-of-truth table.
- Dependencies are one-way: Profile, Dive Map, Profile Badges, Dive Journey, media, memories, and stats feed Passport; Passport must not feed those systems.

## `profile_passport`

Aggregate DTO, not a persistence table.

Fields/sections:

- `user` / profile summary
- `stats`
- `dive_map_preview`
- `badge_showcase`
- `journey_highlights`
- `recent_memories`
- `settings`

Required behavior:

- Composed at read time or from existing child read models.
- Applies public profile and child resource visibility rules.
- Does not duplicate child source data into Passport-owned storage.
- Must degrade safely when Dive Map, Dive Journey, Badges, memories, or media are unavailable.
- Must degrade safely for a new user profile with no map, journey, badges, memories, media, or stats beyond the profile itself.

## Diver Summary

Generated from profile and existing activity.

Examples:

- member since
- dive sites visited
- media posts shared
- memories created
- badges count
- latest activity

Rules:

- Counts must come from source systems.
- Dive-sites-visited count must come from Dive Map / `user_dive_sites` if available.
- Badge count must come from Profile Badges.
- Memory/media counts must come from existing memory/media sources.
- Passport must not recalculate or mutate source stats.
- New users must get stable zero/empty stats without synthetic achievements.

## Dive Map Preview

Pulled from Dive Map / `user_dive_sites`.

Examples:

- visited locations
- latest location
- map preview
- site count

Rules:

- Must not unlock locations.
- Must not increase visited-site counts.
- Must use safe fallback/empty state if Dive Map is not implemented or unavailable.

## Badge Showcase

Pulled from Profile Badges.

Examples:

- certifications
- PBs
- experience badges
- auto stats
- verification indicators if already available

Rules:

- Must not award badges.
- Must not verify credentials.
- Must not invent verification indicators.
- Featured badge ordering can be presentation settings only if implemented.

## Journey Highlights

Pulled from Dive Journey.

Examples:

- selected or recent timeline entries
- memories
- soft milestones

Rules:

- Must not create or mutate Journey entries.
- Must not promote Journey entries into proof, badges, or verified credentials.
- Must use safe fallback/empty state if Dive Journey is not implemented or unavailable.

## Recent Memories / Media

Pulled from Dive Journey, Dive Memories, and/or media posts depending on final implementation.

Rules:

- Must respect source visibility.
- Must not duplicate source records into Passport-owned storage.
- Must not treat media/memories as Dive Map proof unless the source system already exposes them as proof.

## Optional `passport_settings`

Presentation preferences only.

Fields:

- `user_id`
- `show_map`
- `show_badges`
- `show_journey`
- `show_memories`
- `featured_badge_ids` or equivalent feature ordering
- `created_at`
- `updated_at`

Rules:

- Settings are not source of truth for Passport content.
- Settings may hide or order sections, but must not change source stats or child resource visibility.
- `show_map`, `show_badges`, `show_journey`, and `show_memories` only control presentation.
- `featured_badge_ids` or equivalent ordering only references existing badges and must not duplicate badge records.
- Implement only if Phase 1 confirms low risk and product behavior is clear.

## Empty-State Strategy

Passport must function when:

- Dive Map is not implemented.
- Dive Map is implemented but the user has no unlocked sites.
- Dive Journey is not implemented.
- Dive Journey is implemented but empty.
- Profile Badges are unavailable or the user has no badges.
- The user has no memories.
- The user has no media.
- The profile is new.

Required behavior:

- Return stable empty sections or omitted sections according to the shared contract.
- Do not synthesize fake stats, achievements, locations, memories, media, badges, or Journey highlights.
- Do not treat missing child data as a source-system mutation opportunity.

## Deferred Concepts

- Dive Map implementation.
- Dive Journey implementation.
- Badge verification implementation.
- Certification authority behavior.
- Passport PDF/export.
- Mobile implementation.
- Ranking/reputation scoring.
- Any source-data duplication table.
