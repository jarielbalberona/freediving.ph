# Profile Experience Integration Cross-Module Data Flow

## One-Way Ownership Flow

1. Profile owns identity, profile summary, viewer relationship, and public profile visibility.
2. Dive Map owns visited-site proof through `user_dive_sites`.
3. Profile Badges owns badge templates, user badges, verification status, PBs, certifications, roles, and auto stats.
4. Dive Journey owns timeline entries and generated display entries.
5. Dive Passport reads profile, badges, map, journey, memories, media, and stats as a composed presentation layer.
6. Web profile renders the composed experience using backend-owned rules and shared contracts.

Forbidden reverse flows:

- Journey creates `user_dive_sites`.
- Passport mutates Journey entries.
- Passport mutates badges or badge verification.
- Badges create competing visited-site truth.
- Web computes proof or visited-site stats client-side.

## Badge To Dive Map Flow

1. Dive Map derives `user_dive_sites` from qualifying user-owned `media_posts.dive_site_id`.
2. Profile Badges reads `user_dive_sites` for Dive Sites Visited auto stat and future map-based badges.
3. Badge `source_type`/`source_id` supports `dive_map` origins.
4. Badges do not count Dive Memories, shared memories, tagged memories, Journey entries, Passport settings, or client-side map state as proof.

## Dive Map To Journey Flow

1. Dive Map emits or exposes map milestones based on `user_dive_sites`.
2. Journey may create generated entries using `source_type`/`source_id`.
3. Generated entries are idempotent and safe to regenerate.
4. Journey entries remain display/timeline artifacts.
5. Journey entries never create map ownership or visited counts.

## Badges To Journey Flow

1. Badge additions or status changes may become Journey entries.
2. Journey display may include badge-related entries without performing verification.
3. Profile Badges remains authoritative for badge status, verification, and visibility.
4. Journey does not award, verify, revoke, or mutate badges.

## Passport Aggregate Flow

1. Passport aggregate reads:
   - Profile summary.
   - Profile Badges and auto stats.
   - Dive Map preview and visited-site count.
   - Dive Journey highlights.
   - Recent memories/media where available.
2. Passport applies child resource visibility.
3. Passport returns stable empty states for missing/empty child modules.
4. Passport never writes to child systems.
5. Passport never duplicates child source data.

## Public Profile UI Flow

1. Public profile fetches profile summary and module data through shared API clients/contracts.
2. The UI renders standalone sections and/or Passport composition according to the chosen profile UX.
3. Owner-only management controls appear only for the owner.
4. Public viewers see only public/allowed child data.
5. Redundant sections are avoided when Passport already summarizes module data, but source modules remain accessible where product conventions require them.
