# AI-Readable SEO Surfaces Plan

This is intentionally deferred until the metadata, sitemap, entity SEO, and rendered-output checks are stable.

## Candidate Surfaces

- `/llms.txt`
- `/guides/[slug].md`
- `/freediving/[location].md`
- `/features/[slug].md`
- `/about-us.md`

## Rules

- Generate from the same public content registries used by the HTML pages.
- Include the canonical HTML URL in each markdown response.
- Do not create AI-only claims or alternate content.
- Do not include app/auth/admin routes.
- Do not include private, member-only, pending, rejected, deleted, or unapproved user content.
- Do not include unapproved Explore data or sensitive Chika/profile content.

## Deferred Work

Add route handlers only after the current public SEO pages and selected dynamic entity pages have passing rendered-output verification in production.
