# AI-Readable SEO Surfaces

Phase 5 adds AI-readable public content surfaces for stable, indexable SEO pages. These routes mirror the existing public content registries; they are not a separate content source and must not contain private, generated, or AI-only claims.

## Implemented Surfaces

- `/llms.txt`
- `/features.md`
- `/features/[slug].md`
- `/guides.md`
- `/guides/[slug].md`
- `/freediving.md`
- `/freediving/[location].md`
- `/about-us.md`

## Rules

- Generate from the same public content registries used by the HTML pages.
- Include the canonical HTML URL in each markdown response.
- Do not create AI-only claims or alternate content.
- Do not include app/auth/admin routes.
- Do not include private, member-only, pending, rejected, deleted, or unapproved user content.
- Do not include unapproved Explore data or sensitive Chika/profile content.
- Do not include DataForSEO reports, cache files, Search Console exports, or internal SEO workbench output.

## Deferred Dynamic Surfaces

Dynamic entity markdown alternates are intentionally deferred until each entity type has a safe public registry or export contract. Do not add markdown alternates for profiles, Chika, groups, events, schools, instructors, or dive spots by scraping rendered pages or exposing live UGC.
