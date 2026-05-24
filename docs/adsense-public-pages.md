# AdSense on public SEO pages

Freediving Philippines limits AdSense to public SEO/content pages. The product app is community-heavy and contains authenticated flows, user-generated content, messages, profiles, events, groups, Chika, bookings, admin tools, and other surfaces where ads are either a bad user experience or a policy risk.

Code scoping is the primary protection. Dashboard exclusions are only a backup.

## Allowed paths

- `/features`
- `/features/*`
- `/guides`
- `/guides/*`
- `/blog`
- `/blog/*`
- `/freediving`
- `/freediving/*`
- `/about-us`

`/features/events` is allowed because it is a public feature page. `/events` and `/events/*` are blocked because those are app event product routes.

## Blocked paths

- `/`
- `/explore`
- `/events`
- `/events/*`
- `/groups`
- `/groups/*`
- `/chika`
- `/chika/*`
- `/messages`
- `/messages/*`
- `/profile`
- `/profile/*`
- `/settings`
- `/settings/*`
- `/admin`
- `/admin/*`
- `/sign-in`
- `/sign-up`
- authenticated app shell routes
- UGC-heavy app surfaces
- booking, payment, admin, moderation, and product workflows

Do not add ad slots to feeds, Chika thread pages, event detail pages, group pages, profile pages, messaging, school/course booking flows, or admin pages.

## Environment variables

- `NEXT_PUBLIC_ADSENSE_ENABLED`
- `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID`
- `NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT_ID`
- `NEXT_PUBLIC_ADSENSE_TEST_MODE`

Behavior:

- If `NEXT_PUBLIC_ADSENSE_ENABLED !== "true"`, the script and slots no-op.
- If `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` is missing, the script and slots no-op.
- If no slot ID is available, the individual slot no-ops.
- If test mode is enabled, slots render `data-adtest="on"`.
- Non-production defaults to test mode unless `NEXT_PUBLIC_ADSENSE_TEST_MODE="false"`.

Never hardcode the real publisher ID in source.

## Injection point

The AdSense script is injected only from:

`apps/web/src/app/(public)/layout.tsx`

Do not add AdSense to:

- `apps/web/src/app/layout.tsx`
- app/product route layouts
- individual app/community/auth/admin pages

## Slot placement

Reusable slot component:

`apps/web/src/features/public-content/ads/AdSlot.tsx`

Allowed V1 placements:

- after the hero/intro section on public feature pages
- after the hero/intro section on the guides index
- after the intro/header on long-form guide articles
- near the end of long guide articles when the article is long enough

Rules:

- no ads above the H1
- no ads inside nav/header/footer
- no ads inside primary CTA blocks
- no ads inside cards that look like app content
- no ads mixed into user-generated content
- label ads as `Advertisement`
- never ask users to click ads

## Auto ads backup exclusions

If Auto ads are enabled in the AdSense dashboard, configure page exclusions as a backup for:

- `/`
- `/explore`
- `/events*`
- `/groups*`
- `/chika*`
- `/messages*`
- `/profile*`
- `/settings*`
- `/admin*`
- `/sign-in`
- `/sign-up`

These dashboard exclusions are not the primary safety mechanism. The script must remain code-scoped to the public route group.

## ads.txt

No production `apps/web/public/ads.txt` is committed until the real publisher ID is available.

When the publisher ID is known, add:

```txt
google.com, pub-REPLACE_WITH_REAL_PUBLISHER_ID, DIRECT, f08c47fec0942fa0
```

Do not commit a fake production publisher ID.
