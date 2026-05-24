# SEO Post-Deploy Checklist

## Before Deploy

- Run `pnpm -C apps/web type-check`.
- Run `pnpm -C apps/web lint`.
- Run `pnpm -C apps/web test`.
- Run `pnpm -C apps/web seo:test`.
- Run `pnpm -C apps/web seo:audit:mock`.
- Run `pnpm -C apps/web seo:verify-rendered`.
- Check `/sitemap.xml` and `/robots.txt` locally.
- Confirm no generated SEO reports, cache files, or GSC CSV exports are staged.
- Confirm private routes are not in the sitemap.
- Confirm schema is truthful: no fake ratings, reviews, awards, counts, or safety claims.

## After Deploy

Manually verify:

- `https://freediving.ph/sitemap.xml`
- `https://freediving.ph/robots.txt`
- Selected feature, guide, location, and about pages.
- Selected public dynamic entity pages, such as approved dive spots, public events, public groups, schools, and verified instructors.

Check:

- Status 200 for intended public pages.
- Production canonical URL.
- Title and meta description.
- Open Graph preview.
- JSON-LD validity.
- Index/noindex behavior.
- Mobile layout.
- No auth wall for intended public pages.
- No private, member-only, pending, rejected, deleted, or unapproved content.

## Search Console

- Submit the sitemap if public URL coverage changed.
- Inspect 2 to 5 important URLs.
- Request indexing only where appropriate.
- Check coverage again after a few days.
- Periodically export coverage CSVs to `apps/web/scripts/seo/gsc/`.
- Run `pnpm -C apps/web seo:gsc:coverage`.

## DataForSEO

- Run mock/local audit before paid calls.
- Run paid DataForSEO calls only intentionally with `--confirm-live`.
- Prefer cache-only reruns after live checks.
- Treat reports as QA input, not automatic truth.

## AdSense

- Keep AdSense scoped to public SEO/content pages only.
- Verify app, community, auth, admin, booking, and messaging pages do not load ads.
- Keep Auto ads disabled or tightly excluded in the dashboard.
- Never ask users to click ads.

## Indexing Safety

Confirm these are not indexed:

- `/admin`
- `/messages`
- `/settings`
- `/profile` private areas
- Booking/payment flows
- Private or member-only groups
- Member-only or pseudonymous-sensitive Chika
- Pending, rejected, deleted, hidden, or unapproved content
