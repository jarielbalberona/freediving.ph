# SEO Ranking Audit: `freediving philippines`

Date: 2026-05-27  
Scope: `apps/web` for [https://freediving.ph](https://freediving.ph)

## 1. Executive verdict

The technical SEO foundation is materially better than a typical early-stage community app. Static public SEO pages, location pages, dynamic entity hardening, sitemap/robots generation, JSON-LD helpers, rendered-output verification, and local SEO tooling are all real and working.

That does **not** mean the site is ready to rank `#1` for `freediving philippines`.

Bluntly: **no, not yet**.

Current chance: **low**

Reason:
- The best intent-match page for the head term, `/freediving/philippines`, exists, but it is still too shallow to beat entrenched destination, certification, school, and community results.
- Several crawlable public app routes are still inheriting root metadata and root canonical values in rendered output.
- The current SEO audit/verifier only covers the curated SEO content set, not the full public crawlable surface already allowed in `robots.txt` and listed in `sitemap.xml`.
- Directory/entity quality is uneven. Dive spot pages are promising. School and instructor profiles are still thin on trust, editorial, and local-detail signals.
- There is no evidence yet of enough authority, links, brand demand, or indexed topical depth to outrank established domains and community platforms.

Top blockers:
- Crawlable public routes with weak metadata discipline: `/explore`, `/schools`, and likely the other public app indexes.
- Audit coverage blind spot for public app/community routes.
- Thin national hub page for the primary keyword.
- Thin school and instructor public profiles.
- Weak authority compared with PADI, Molchanovs, CMAS/AIDA pages, local schools, Reddit, Facebook, and Instagram.

Fastest wins:
- Fix route-level metadata and canonicals on crawlable public app index pages.
- Expand SEO tooling coverage to all public crawlable routes, not only the content marketing subset.
- Strengthen `/freediving/philippines` as the explicit national hub.
- Improve school/instructor trust signals and interlink them into destination pages.

Long-term requirements:
- More high-quality destination content.
- Stronger school/instructor directory data.
- Better internal linking.
- Richer approved dive spot pages.
- More original/community media.
- Search Console indexing evidence.
- External links, brand mentions, and community authority.

## 2. What is already strong

- Centralized metadata helper exists in [`apps/web/src/features/public-content/seo/metadata.ts`](../apps/web/src/features/public-content/seo/metadata.ts).
- Centralized JSON-LD helper exists in [`apps/web/src/features/public-content/seo/jsonLd.ts`](../apps/web/src/features/public-content/seo/jsonLd.ts).
- Public SEO route inventory is centralized in [`apps/web/src/features/public-content/seo/routes.ts`](../apps/web/src/features/public-content/seo/routes.ts).
- `robots.txt` is conservative and blocks private/auth/admin/member areas while allowing the intended public surface.
- `sitemap.xml` uses production URLs and includes stable public routes plus approved dynamic public entities.
- Dynamic entity pages already use conservative indexability logic instead of blindly indexing everything.
- Rendered-output verification is real, not theoretical.
- `ads.txt` exists and is correct.
- Generated SEO reports, cache files, and GSC CSV inputs are ignored from git.

## 3. What is weak or missing

- The current technical audit gives a false sense of coverage because it only validates the curated public SEO pages in `seo-targets.json`.
- Crawlable public app indexes are in the sitemap and allowed by robots, but some still render root-level metadata instead of page-specific metadata.
- `/freediving/philippines` is the right URL for the target keyword, but the page is still content-light for a head term.
- School and instructor directory pages are structurally valid but not yet strong enough as trust-first, locally useful search landing pages.
- Instructor pages are indexable only when verified, which is correct, but they are still thin and are not currently part of the sitemap.
- Community surfaces like groups, events, and chika are product-valid but still weak as search landing pages unless treated more intentionally.

## 4. Part 1: Technical SEO baseline verification

### Commands run

From `apps/web`:

```bash
node --import tsx --test scripts/seo/tests/*.test.ts
node --import tsx scripts/seo/audit.ts --provider mock --all
node --import tsx scripts/seo/verify-rendered-output.ts
node --import tsx scripts/seo/serp-rank.ts --provider dataforseo --search-market ph --cache-only --limit 5
```

### Results

- SEO tests: `15/15` passing
- Mock audit: `24 passing, 0 warning, 0 failing pages`
- Rendered verifier: `51 passing, 0 warning, 0 failing rendered routes`
- Cache-only SERP rank report generated successfully

### What these checks do prove

- The curated public SEO pages under `/features`, `/guides`, `/freediving`, and `/about-us` are technically solid.
- Canonicals on those audited routes are using `https://freediving.ph`.
- Structured data is present and conservative on the audited route set.
- AI-readable route variants and system files are rendering.

### What these checks do **not** prove

They do **not** prove the whole public SEO surface is clean.

The current audit and rendered verifier both load routes from `seo-targets.json`, not from the full public route registry:

- [`apps/web/scripts/seo/audit.ts`](../apps/web/scripts/seo/audit.ts) uses `loadTargets()` to select pages.
- [`apps/web/scripts/seo/verify-rendered-output.ts`](../apps/web/scripts/seo/verify-rendered-output.ts) builds `publicSeoRoutes` from `loadTargets()`.
- [`apps/web/scripts/seo/seo-targets.json`](../apps/web/scripts/seo/seo-targets.json) only contains `/features*`, `/guides*`, `/freediving*`, and `/about-us`.

That excludes public app index routes already listed in [`apps/web/src/features/public-content/seo/routes.ts`](../apps/web/src/features/public-content/seo/routes.ts):

- `/explore`
- `/buddies`
- `/chika`
- `/events`
- `/groups`
- `/schools`

This is the main technical audit blind spot.

### `robots.txt`

Rendered `robots.txt` is correct in broad terms:

- Public routes allowed: `/`, `/about-us`, `/features`, `/freediving`, `/guides`, `/explore`, `/buddies`, `/chika`, `/events`, `/groups`, `/schools`
- Private routes blocked: `/api/`, `/admin`, `/auth`, `/manage`, `/messages`, `/moderation`, `/notifications`, `/onboarding`, `/profile`, `/saved`, `/settings`, `/explore/submissions`, `/sign-in`, `/sign-up`
- Host uses `https://freediving.ph`
- Sitemap uses `https://freediving.ph/sitemap.xml`

Source: [`apps/web/src/app/robots.ts`](../apps/web/src/app/robots.ts)

### `sitemap.xml`

Rendered `sitemap.xml` uses production URLs and includes:

- stable public app index routes
- static SEO content routes
- dynamic dive spot pages
- dynamic group pages
- dynamic event pages
- dynamic chika pages
- dynamic school pages

Source: [`apps/web/src/app/sitemap.ts`](../apps/web/src/app/sitemap.ts)

Two important notes:

1. This is correctly broad for crawl discovery.
2. It currently includes public app indexes even though some of those pages still inherit generic root metadata. That is not fatal, but it is sloppy and avoidable.

### `ads.txt`

Rendered `ads.txt` exists and is correct:

```txt
google.com, pub-1422121189880046, DIRECT, f08c47fec0942fa0
```

### Generated file hygiene

Generated SEO artifacts are ignored from git via root `.gitignore`:

- `apps/web/scripts/seo/cache/*.json`
- `apps/web/scripts/seo/reports/*.md`
- `apps/web/scripts/seo/reports/*.json`
- `apps/web/scripts/seo/gsc/*.csv`

### Actual blocker found

Two crawlable public routes were manually re-checked in rendered output and still inherit the root metadata:

- `/explore`
  - title: `Freediving Philippines`
  - description: root site description
  - canonical: `https://freediving.ph`
- `/schools`
  - title: `Freediving Philippines`
  - description: root site description
  - canonical: `https://freediving.ph`

That is a real problem because both routes are:

- allowed by `robots.txt`
- included in `sitemap.xml`
- intended as public discovery pages

The source-level reason is obvious:

- [`apps/web/src/app/explore/page.tsx`](../apps/web/src/app/explore/page.tsx) has an H1 but no route-level metadata export.
- [`apps/web/src/app/schools/page.tsx`](../apps/web/src/app/schools/page.tsx) has no route-level metadata export.
- Root defaults come from [`apps/web/src/app/layout.tsx`](../apps/web/src/app/layout.tsx).

I would assume the same class of issue exists on `/events`, `/groups`, `/chika`, and `/buddies` until proven otherwise.

## 5. Part 2: Current ranking potential for `freediving philippines`

Current chance: **low**

Reason:
- The intent-match route is correct: `/freediving/philippines`.
- The technical base is respectable.
- The content and authority are still well below what is usually required to beat entrenched destination, training-agency, school, and community results for a head term.

Top blockers:
- `/freediving/philippines` is still too thin at roughly `774` audited words.
- Supporting destination pages are mostly in the `570-658` word range.
- Guides are mostly around `500-574` words.
- Feature pages are mostly around `260-335` words.
- Public directory pages are uneven in quality and trust depth.
- Crawlable app index routes still have metadata problems.
- No proof yet of enough backlinks, mentions, or brand demand.

Fastest wins:
- Make `/freediving/philippines` the deliberate national hub, not just another location page.
- Repair metadata on public app index routes already allowed and indexed.
- Expand internal linking from guides, features, and directory pages into `/freediving/philippines` and the strongest destination pages.
- Raise school/instructor profile quality with real trust data instead of just names and short blurbs.

Long-term requirements:
- Destination cluster depth.
- Better entity data quality.
- More media and first-party proof.
- Better indexing evidence in Search Console.
- Real external authority.

## 6. Part 3, Pillar 1: E-E-A-T and directory optimization

### Dive spot pages: strongest current directory asset

The public dive spot route at [`apps/web/src/app/explore/sites/[slug]/page.tsx`](../apps/web/src/app/explore/sites/%5Bslug%5D/page.tsx) is the best current directory template on the site.

What it already does well:
- public indexability is conditional, not automatic
- route-level metadata is generated
- `WebPage`, `BreadcrumbList`, and `Place` schema are injected
- trust labels exist for verification source
- last-updated and listed-since signals exist
- hazards, access, fees, contact, depth, coordinates, and condition summary are present
- community trust card includes public-safe credibility context

This is the right direction.

What is still missing or inconsistent for SEO competitiveness:
- stronger location hierarchy display: province, municipality, region
- explicit beginner suitability only when supported by reviewed data
- clearer hazard/current/boat-traffic notes formatting
- marine protection/local rules where reliable
- better related-links modules to nearby schools, instructors, events, and guides
- stronger evidence framing around who reviewed or verified the listing and when

### School pages: technically valid, still thin

The public school route at [`apps/web/src/app/schools/[slug]/page.tsx`](../apps/web/src/app/schools/%5Bslug%5D/page.tsx) is crawlable and uses truthful `LocalBusiness` schema, which is good.

The problem is page quality, not schema existence.

Current weaknesses:
- school H1s and metadata are acceptable, but public profile depth is still light
- the page is mostly short description, tabs, and course cards
- there is no obvious public verification state, editorial status, or last-updated signal
- there is no explicit safety-reviewed note
- local area context is weak
- there is no strong credibility block explaining instructors, certifications taught, standards followed, or who maintains the listing

Current page layout is still too product-shell-like for destination or directory SEO.

### Instructor pages: correct gatekeeping, weak depth

The public instructor route at [`apps/web/src/app/instructors/[username]/page.tsx`](../apps/web/src/app/instructors/%5Busername%5D/page.tsx) is correctly conservative:

- noindex when not verified
- `Person` schema only when verified

That part is correct.

The weakness is that the public page is still too thin to compete:

- verified badge
- location subtitle
- short bio
- certifications list

That is not enough to be a strong search result for instructor-intent or local-course-intent queries.

### Event and group pages: searchable, but not yet SEO assets

Event and group detail pages are valid public product pages, but they are not yet strong search landing pages for broad discovery intent. They need:

- clearer local context
- stronger trust framing
- related destination links
- better long-tail intent handling

### Chika pages: treat conservatively

Chika should stay conservative. Public discussion indexing is only worth doing when the thread is safe, stable, and genuinely useful outside the app context.

Do not force indexing for low-trust or thin discussion pages.

### Recommended directory data layout

For public directory pages, the recommended structure is:

```txt
H1
Location/area
Short summary
Key facts
Safety/local guidance
Related guides
Nearby/related dive spots
Schools/instructors/events nearby
Contribution/review status
CTA
```

### Recommended additions by entity type

Dive spot pages:
- last updated
- contribution source
- moderation/review status
- province / municipality / region
- beginner suitability if reliable
- depth range if reliable
- access notes if safe
- hazard/current/boat-traffic notes if reliable
- marine protection/local rules if reliable
- nearby schools/events/groups

School pages:
- verification state
- base location hierarchy
- course/certification types offered
- instructor roster only if verified and privacy-safe
- last updated
- moderation/review status
- public-safe standards/safety note

Instructor pages:
- verification state
- home area
- agencies/certification scope only if verified
- public-safe specialties only if supported
- last updated
- nearby schools or destinations

Do **not** add fake ratings, fake reviews, fake awards, fake badges, or fake certification claims.

## 7. Part 3, Pillar 2: Hub-and-spoke architecture

### Best main hub

Main hub for `freediving philippines`: **`/freediving/philippines`**

Reason:
- It is the exact intent match for the head term.
- It already exists.
- It is already represented in the SEO content system.
- `/freediving` is better used as the broader collection/index page for locations, not the final national landing page for the primary keyword.

### Recommended role split

Parent hub URL:
- `/freediving/philippines`

Collection/index URL:
- `/freediving`

Primary spokes:
- `/freediving/siquijor`
- `/freediving/batangas`
- `/freediving/cebu`
- `/freediving/dauin`
- `/freediving/apo-island`
- `/freediving/panglao`
- `/freediving/moalboal`
- future: `/freediving/coron`
- future: `/freediving/anilao`

Support spokes:
- `/guides/how-to-start-freediving-in-the-philippines`
- `/guides/freediving-safety-basics`
- `/guides/freediving-certifications-philippines`
- `/features/dive-spots`
- `/features/schools-and-courses`
- approved dive spot pages
- school pages
- instructor pages

### Internal linking rules

- `/freediving` should link prominently to `/freediving/philippines` as the national planning page.
- `/freediving/philippines` should link out to each major destination page with descriptive destination anchors.
- Every destination page should link back to `/freediving/philippines` and sideways to closely related destinations.
- Guides should link contextually to the national hub and then to the relevant destination pages.
- Approved dive spot pages should link to their parent destination page, relevant schools, and relevant guides.
- School/instructor pages should link to the parent destination page when location data is reliable.

### Anchor text rules

Use natural anchors:

- `freediving in the Philippines`
- `freediving in Panglao`
- `freediving in Moalboal`
- `freediving schools in Batangas`
- `freediving safety basics`

Do not repeat exact-match anchors mechanically in every block.

### Contextual link placement

Put links in:
- intro paragraphs when intent is direct
- destination comparison sections
- safety/planning sections
- related pages modules
- nearby entities blocks

Avoid dumping all links into generic footer cards.

### Breadcrumb pattern

Recommended:

```txt
Home > Freediving > Philippines
Home > Freediving > Philippines > Panglao
Home > Explore > Dive Spots > [Spot Name]
Home > Schools > [School Name]
Home > Instructors > [Instructor Name]
```

### Sitemap behavior

- Keep the hub and high-quality spokes in sitemap.
- Include dynamic entity pages only when public-safe and index-worthy.
- Do not include thin, unpublished, low-trust, or blocked variants.

### When **not** to create a spoke page

Do not create a destination spoke when:
- there is no distinct local intent
- there is not enough safe, useful, location-specific data
- the page would be a thin near-duplicate of another location page
- there are no meaningful internal links or supporting entities for that location

### Suggested wireframe

Hub page (`/freediving/philippines`):

```txt
H1: Freediving in the Philippines
Intro summary
Why dive here / who this is for
Top destinations
Planning and safety
How to find schools, buddies, events, and groups
Featured dive spots
Related guides
Community CTA
```

Destination page (`/freediving/[location]`):

```txt
H1: Freediving in [Location]
Area summary
What the location is known for
Conditions and planning notes
Beginner/intermediate suitability where supported
Approved dive spots in or near the area
Nearby schools / instructors / events / groups
Related guides
CTA
```

### Specific destination recommendations

Panglao:
- high-value page to deepen now
- strong travel + school + community overlap

Moalboal:
- high-value page to deepen now
- strong destination recognition and course intent overlap

Coron:
- create only when data can support a real local page, not a placeholder

Anilao:
- create only when you can support local dive spot, school, and planning data at useful depth

## 8. Part 3, Pillar 3: On-page SEO and local intent

### Current state

Static content pages are generally disciplined. The bigger issue is that some public app index pages are still using root defaults instead of page-specific metadata.

### Page-type recommendations

Main hub page:

```txt
Primary keyword: freediving philippines
H1: Freediving in the Philippines
Title: Freediving in the Philippines | Spots, Schools, Guides and Community
Meta description: Plan freediving in the Philippines with destination guides, dive spot notes, nearby schools, events, and local community context.
```

Destination pages:

```txt
Primary keyword: freediving [location]
H1: Freediving in [Location]
Title: Freediving in [Location] | Spots, Schools and Planning Guide
Meta description: Plan freediving in [Location] with local dive spot notes, safety reminders, nearby schools, events, and community guidance from Freediving Philippines.
```

Guide pages:

```txt
Primary keyword: one topic-specific phrase
H1: [Guide Topic]
Title: [Guide Topic] | Freediving Philippines
Meta description: Practical guidance for [topic] in the Philippines, with safety reminders, local context, and next-step links.
```

Dive spot detail pages:

```txt
Primary keyword: [spot name] freediving spot
H1: [Spot Name] Freediving Spot
Title: [Spot Name] Freediving Spot | [Area]
Meta description: Public dive spot notes for [Spot Name], including access, depth, hazards, conditions, and nearby freediving resources.
```

School pages:

```txt
Primary keyword: freediving school [location]
H1: [School Name] Freediving School in [Location]
Title: [School Name] | Freediving School in [Location]
Meta description: Explore [School Name] in [Location], with course information, location context, and public school details on Freediving Philippines.
```

Instructor pages:

```txt
Primary keyword: freediving instructor [location]
H1: [Instructor Name] Freediving Instructor in [Location]
Title: [Instructor Name] | Freediving Instructor in [Location]
Meta description: Public instructor profile for [Instructor Name] in [Location], including verified status and certification details where available.
```

Event pages:

```txt
Primary keyword: freediving event [location/topic]
H1: [Event Name]
Title: [Event Name] | Freediving Event in [Location]
Meta description: Public freediving event details for [Location], including timing, organizer context, and participation information.
```

Group pages:

```txt
Primary keyword: freediving group [location]
H1: [Group Name]
Title: [Group Name] | Freediving Group in [Location]
Meta description: Public group page for [Group Name], with local context, membership details, and related freediving resources.
```

### Local intent rules

- One primary keyword target per page.
- Use local modifiers where natural.
- Use related phrases in headings and body copy, not repeated exact-match stuffing.
- Put safety, trust, and usefulness ahead of keyword density.

### Before/after example for weak public app index pages

Current `/schools` rendered state:

```txt
Title: Freediving Philippines
Canonical: https://freediving.ph
```

Recommended target state:

```txt
Title: Freediving Schools in the Philippines | Courses and Local Training
Canonical: https://freediving.ph/schools
```

Current `/explore` rendered state:

```txt
Title: Freediving Philippines
Canonical: https://freediving.ph
```

Recommended target state:

```txt
Title: Freediving Dive Spots in the Philippines | Explore Sites and Local Notes
Canonical: https://freediving.ph/explore
```

## 9. Part 3, Pillar 4: Structured data and schema markup

### What exists now

Current helper coverage in [`apps/web/src/features/public-content/seo/jsonLd.ts`](../apps/web/src/features/public-content/seo/jsonLd.ts):

- `WebSite`
- `Organization`
- `BreadcrumbList`
- `WebPage`
- `Article`
- `Place`
- `Event`
- `LocalBusiness`
- `Person`
- `DiscussionForumPosting`

This is a good conservative base.

### What is missing

Useful additions, if backed by truthful data:

- `CollectionPage`
- `ItemList`
- `FAQPage`
- `TouristDestination` only when the destination data is genuinely good enough
- `TouristAttraction` only when it fits better than `Place`

### Recommended schema by page type

Hub page:
- `WebPage`
- `CollectionPage`
- `BreadcrumbList`

Guide page:
- `Article` or `BlogPosting`
- `BreadcrumbList`
- `FAQPage` only if real FAQs exist on-page

Destination page:
- `WebPage` or `TouristDestination`
- `BreadcrumbList`
- `ItemList` for approved related dive spots when safe

Dive spot page:
- `Place` or `TouristAttraction`
- `WebPage`
- `BreadcrumbList`

School page:
- `Organization` or `LocalBusiness`
- `WebPage`
- `BreadcrumbList`

Instructor page:
- `Person` only if verified and public-safe
- otherwise `WebPage` or noindex

Event page:
- `Event`
- `BreadcrumbList`

Group page:
- `WebPage`
- possibly `Organization` conservatively

Chika thread:
- `DiscussionForumPosting` only when safe/public/non-sensitive
- otherwise `WebPage` or noindex

### Code-level recommendations

[`apps/web/src/features/public-content/seo/jsonLd.ts`](../apps/web/src/features/public-content/seo/jsonLd.ts)
- add helpers for `CollectionPage`, `ItemList`, and `FAQPage`
- keep helpers conservative and data-driven
- do not add review/rating helpers unless moderation and verification policy is ready

[`apps/web/src/features/public-content/seo/metadata.ts`](../apps/web/src/features/public-content/seo/metadata.ts)
- keep as central canonical/metadata builder
- extend usage into public app index routes
- do not allow crawlable pages to silently inherit root canonical unless that is intentional

Dynamic entity metadata files
- keep existing `buildNoindexMetadata` / `buildPublicMetadata` split
- add richer descriptions only when the data source is stable and truthful

### Example JSON-LD patterns

Local dive center / school listing:

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Example Freediving School",
  "url": "https://freediving.ph/schools/example-school",
  "description": "Freediving school profile with public course and location information.",
  "address": "Panglao, Bohol, Philippines",
  "sameAs": [
    "https://example.com",
    "https://www.instagram.com/example"
  ]
}
```

Destination guide/article:

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Freediving in Panglao",
  "url": "https://freediving.ph/freediving/panglao",
  "description": "Planning guide for freediving in Panglao with local context, safety notes, and related resources."
}
```

FAQ schema for a guide page:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "When is the best time to freedive in the Philippines?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The answer depends on the exact destination, season, wind, swell, and local conditions."
      }
    }
  ]
}
```

ItemList schema for a location page:

```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Approved dive spots near Panglao",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "url": "https://freediving.ph/explore/sites/spot-one",
      "name": "Spot One"
    }
  ]
}
```

Do **not** add:
- `aggregateRating`
- `Review`
- fake offers
- fake prices
- fake awards
- fake certifications
- fake customer counts

## 10. Part 3, Pillar 5: Competitive gap analysis

### Evidence used

Live paid DataForSEO calls were **not** used.

Reason:
- no DataForSEO credentials were available in the current environment
- broad paid calls were explicitly out of scope

A cache-only SERP check was run:

```bash
node --import tsx scripts/seo/serp-rank.ts --provider dataforseo --search-market ph --cache-only --limit 5
```

### What the cache-only SERP evidence shows

For the inspected query set, Freediving.ph was **not found** in the inspected results for:

- `freediving philippines app`
- `freediving spots philippines`
- `freediving buddy philippines`
- `freediving events philippines`
- `freediving groups philippines`

Competing domains appearing in cached results included:

- `reddit.com`
- `padi.com`
- `molchanovs.com`
- `facebook.com`
- `instagram.com`
- `cmas.org`
- `freediveacademy.com`
- `immersiafreediving.com`

### Real gap versus competitors

What they likely have that FPH still lacks:

- older/stronger domains
- more backlinks and brand mentions
- deeper destination content
- stronger school/course credibility
- stronger certification/training trust
- richer media libraries
- broader FAQ coverage
- stronger long-tail destination clusters
- more real-world community demand signals

### Realistic content-depth targets

These are realistic, not decorative:

- `/freediving/philippines`: `1,500-2,500` useful words
- `/freediving/[location]`: `900-1,500` useful words where data supports it
- `/guides/[slug]`: `800-1,500` useful words depending on topic
- `/explore/sites/[slug]`: structured data blocks plus `300-800` words where safe data exists
- `/schools/[slug]`: data-rich profile; long-form only if the school has enough credible material

### Media needs

Needed only when they improve trust or planning value:

- original photos
- community photos
- map context
- spot cards
- school logos
- event images
- course/session info visuals
- short videos
- FAQ accordions
- tables and checklists

Do not add media for decoration.

## 11. Prioritized action plan

### P0 - Critical blockers

#### Code/technical tasks

Task:
- Add route-level metadata and canonical handling for `/explore`, `/schools`, `/events`, `/groups`, `/chika`, and `/buddies`.

Why it matters:
- These pages are allowed in `robots.txt` and listed in `sitemap.xml`. Root metadata inheritance on crawlable public routes is sloppy and suppresses intent clarity.

Affected routes/files:
- `apps/web/src/app/explore/page.tsx`
- `apps/web/src/app/schools/page.tsx`
- `apps/web/src/app/events/page.tsx`
- `apps/web/src/app/groups/page.tsx`
- `apps/web/src/app/chika/page.tsx`
- `apps/web/src/app/buddies/page.tsx`
- `apps/web/src/features/public-content/seo/metadata.ts`

Expected SEO impact:
- High technical cleanliness improvement.

Implementation risk:
- Low.

Verification:
- rerun rendered-output checks and manual curl checks for title, description, canonical

Task:
- Expand the SEO audit/verifier route set to include all public crawlable app indexes and representative public entity routes.

Why it matters:
- Current green reports are incomplete.

Affected routes/files:
- `apps/web/scripts/seo/seo-targets.json`
- `apps/web/scripts/seo/audit.ts`
- `apps/web/scripts/seo/verify-rendered-output.ts`
- `apps/web/src/features/public-content/seo/routes.ts`

Expected SEO impact:
- High operational impact because it prevents false confidence.

Implementation risk:
- Low to medium.

Verification:
- rerun `seo:audit` and `seo:verify-rendered`

### P1 - Highest SEO leverage

#### Content tasks

Task:
- Rework `/freediving/philippines` into the explicit national hub page for the head term.

Why it matters:
- This is the most important ranking asset for `freediving philippines`.

Affected routes/files:
- `apps/web/src/features/public-content/content/locations.ts`
- `apps/web/src/features/public-content/components/LocationLandingPage.tsx`

Expected SEO impact:
- High.

Implementation risk:
- Medium.

Verification:
- page-level audit score, internal link count, rendered content review, Search Console impressions/clicks over time

Task:
- Add stronger related-link modules from guides, features, and destination pages into the national hub and major spokes.

Why it matters:
- The cluster exists, but the internal authority flow is still underpowered.

Affected routes/files:
- public content page components and content definitions

Expected SEO impact:
- Medium to high.

Implementation risk:
- Low to medium.

Verification:
- internal link counts in audit reports and manual render checks

#### Data/model tasks

Task:
- Add public trust fields for school and instructor profiles: verification state, updated date, area hierarchy, course/certification scope, moderation/review status.

Why it matters:
- Thin directory profiles will not compete in local search or trust-sensitive travel/training queries.

Affected routes/files:
- school/instructor DTOs in backend and shared types
- `services/fphgo`
- `packages/types`
- school/instructor public pages in `apps/web`

Expected SEO impact:
- Medium to high.

Implementation risk:
- Medium.

Verification:
- rendered page review, schema review, noindex/index logic review

### P2 - Medium-term authority building

#### Content tasks

Task:
- Deepen Panglao and Moalboal first, then Coron and Anilao only when data quality is sufficient.

Why it matters:
- These are the obvious destination-intent expansion targets.

Affected routes/files:
- `apps/web/src/features/public-content/content/locations.ts`

Expected SEO impact:
- Medium to high.

Implementation risk:
- Medium.

Verification:
- content depth, internal links, impressions by destination query

Task:
- Standardize approved dive spot content blocks so public dive spot pages have more consistent local detail.

Why it matters:
- Dive spots are the strongest current directory surface and should become a compounding SEO asset.

Affected routes/files:
- dive spot public page and backend data model

Expected SEO impact:
- Medium.

Implementation risk:
- Medium.

Verification:
- spot page completeness review and structured data validation

### P3 - Nice-to-have / later

#### Code/technical tasks

Task:
- Add `CollectionPage`, `ItemList`, and `FAQPage` helpers where real data exists.

Why it matters:
- Better structured data can improve machine understanding, but it will not rescue thin content or weak authority.

Affected routes/files:
- `apps/web/src/features/public-content/seo/jsonLd.ts`

Expected SEO impact:
- Low to medium.

Implementation risk:
- Low if kept truthful.

Verification:
- rendered JSON-LD inspection and rich result validation

#### Search Console / DataForSEO monitoring tasks

Task:
- Track impressions, indexing, and query spread for `/freediving/philippines`, `/freediving/[location]`, and dynamic entity pages.

Why it matters:
- You need evidence that the hub-and-spoke model is being discovered and matched correctly.

Affected routes/files:
- GSC exports
- SEO reports/cache workflow

Expected SEO impact:
- Indirect but necessary.

Implementation risk:
- Low.

Verification:
- recurring GSC review

#### Backlink/community authority tasks

Task:
- Earn real mentions from schools, instructors, destination communities, clubs, and relevant travel/freediving references.

Why it matters:
- Code will not manufacture head-term authority.

Affected routes/files:
- none; this is off-page work

Expected SEO impact:
- Very high if executed well.

Implementation risk:
- Operational, not technical.

Verification:
- referral domains, branded search, ranking movement, Search Console query breadth

## 12. DataForSEO and search evidence used

- `node --import tsx scripts/seo/serp-rank.ts --provider dataforseo --search-market ph --cache-only --limit 5`
- Cache-only run only
- No live paid calls made
- No DataForSEO credits spent in this audit

## 13. Rendered-page verification summary

Verified:
- `robots.txt` renders correctly
- `sitemap.xml` renders correctly
- `ads.txt` renders correctly
- curated SEO content pages pass the current audit/verifier toolchain
- dynamic public school page renders correct canonical/title/schema

Found issue:
- `/explore` and `/schools` still inherit root title/description/canonical in rendered HTML

Inference:
- public app index routes need the same metadata discipline already applied to the curated SEO content pages

## 14. Risks and caveats

- The current toolchain is good, but it is still overfitted to the curated content route list.
- Search competitiveness for `freediving philippines` is not just a code problem.
- Even after the technical cleanup, the site still needs more topical depth, stronger entity data, and real authority signals.
- School and instructor pages can become SEO liabilities if they are indexed at scale before they are useful enough.

## 15. Recommended next implementation prompt or tickets

1. Fix metadata and canonical handling for all crawlable public app index routes and extend rendered verification coverage to them.
2. Expand the SEO audit target set beyond `seo-targets.json` so public app routes and sample dynamic entities are part of every verification run.
3. Strengthen `/freediving/philippines` into the clear national hub with deeper planning, destination comparison, and internal linking.
4. Add real trust fields and editorial signals to school and instructor public profiles before pushing harder on directory indexing.
5. Add truthful `CollectionPage` and `ItemList` schema support for hub and destination pages where data quality is sufficient.
