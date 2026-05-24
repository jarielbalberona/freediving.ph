# SEO Metadata and Dynamic Entity Audit

Date: 2026-05-24

## Central Pattern

Public SEO pages should use:

- `apps/web/src/features/public-content/seo/metadata.ts` for title, description, canonical, robots, Open Graph, and Twitter metadata.
- `apps/web/src/features/public-content/seo/jsonLd.ts` for truthful JSON-LD helpers.
- `apps/web/src/features/public-content/components/StructuredData.tsx` for JSON-LD output.
- `apps/web/src/features/public-content/seo/routes.ts` for stable public route lists used by sitemap and robots.

Canonical production origin is `https://freediving.ph`. Public SEO pages should not emit localhost or preview canonicals.

## Public Content Routes

| Route group | Status |
| --- | --- |
| `/features/*` | Uses central metadata helper and public layout JSON-LD. |
| `/guides/*` | Uses central metadata helper, Article JSON-LD for guide articles, breadcrumbs, and public layout JSON-LD. |
| `/freediving/*` | Uses central metadata helper, breadcrumbs, WebPage JSON-LD, and approved/fallback Explore spot sections. |
| `/about-us` | Uses central metadata helper, breadcrumbs, and public layout JSON-LD. |

## Dynamic Entity Rules

| Entity | Route | Safe to index | Rule |
| --- | --- | --- | --- |
| Dive spots | `/explore/sites/[slug]` | Yes | Only approved Explore sites returned by the public API are indexable. |
| Events | `/events/[slug]` | Conditional | Index only `published` and `public` events. Private or unavailable events are noindex if rendered. |
| Groups | `/groups/[slug]` | Conditional | Index only `active` and `public` groups. Private, archived, or deleted groups are not indexable. |
| Schools | `/schools/[slug]` | Yes | Public API returns published schools only. |
| Courses | `/schools/[slug]/courses/[courseSlug]` | Yes | Public API returns published courses under published schools only. Booking routes are noindex. |
| Instructors | `/instructors/[username]` | Conditional | Index only verified instructor profiles returned by the public API. No public listing endpoint exists yet, so sitemap inclusion is deferred. |
| Chika threads | `/chika/[slug]` | Conditional | Index only visible, non-pseudonymous threads. Hidden or pseudonymous-category threads are noindex and excluded from sitemap. |
| Public profiles | `/[username]` | No for now | No explicit profile privacy/indexing contract exists. Profiles and media posts are noindex until that exists. |

## Current Gaps

- Instructor sitemap inclusion is deferred until there is a safe public verified-instructor listing endpoint.
- Public profiles remain noindex because there is no explicit user privacy opt-in for search indexing.
- Chika indexing stays conservative; pseudonymous categories are excluded from sitemap and noindexed.
- Entity pages now emit conservative WebPage/breadcrumb schema, with more specific schema only when the public data supports it.
