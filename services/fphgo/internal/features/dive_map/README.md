# Dive Map Read Model Boundary

`user_dive_sites` is the V1 source of truth for proof-based visited dive sites.

Future Profile Badges, Dive Journey, and Dive Passport work must consume the read model instead of deriving visited-site state from memories, Journey entries, Passport state, badge rows, feed activity, comments, likes, or manual inputs.

Current integration points:

- Media proof derivation: `repo.RecomputeUserDiveSite(ctx, userID, diveSiteID)`.
- Profile-facing marker reads: profile repository `GetProfileDiveMapByUsername` and `GetProfileDiveMapSiteByUsername`.
- Visited-site count: profile repository `CountDiveSitesVisitedByUsername` and `CountDiveSitesVisitedByUserID`, which use `user_dive_sites` when the table is present.

Dive Memories and tagged-user sharing are intentionally not part of this boundary. A separate locked `dive-memories` initiative must define ownership, tagging, acceptance, blocking, visibility, and authorization before memory content can appear in map marker detail or any downstream profile experience.
