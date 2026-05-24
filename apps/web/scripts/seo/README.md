# Freediving Philippines SEO Workbench

This is a local SEO/content quality workbench for Freediving Philippines public pages.

It is not an app feature, not a public UI, not an admin UI, and not a rank-tracking platform. It must stay out of the Next.js runtime. Reports are decision support only; humans still edit content manually.

## What It Checks

- rendered local page structure
- title, meta description, canonical, robots, Open Graph, and JSON-LD
- heading structure and internal links
- thin content and placeholder/developer-facing copy risk
- copied-project leakage terms
- mock or DataForSEO SERP evidence
- mock or DataForSEO keyword volume evidence

## Environment

Defaults are safe for local work:

```bash
SEO_SERP_PROVIDER=mock
SEO_TARGET_BASE_URL=http://localhost:3000
SEO_SERP_CACHE_TTL_HOURS=168
SEO_SERP_MAX_RESULTS=10

DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=
```

Credentials are only needed for confirmed live DataForSEO calls. They are not required for local page audits or mock reports.

## Commands

Run the Next dev server first when auditing rendered local pages:

```bash
pnpm dev
```

Then run local tooling:

```bash
pnpm seo:test
pnpm seo:audit:mock
pnpm seo:audit -- --path /guides/freediving-safety-basics
pnpm seo:audit -- --all
pnpm seo:keywords:plan -- --group freediving_guides_ph
pnpm seo:keywords:plan -- --group freediving_locations_ph --provider mock
pnpm seo:serp:rank -- --provider mock --search-market ph
pnpm seo:serp:rank -- --provider dataforseo --search-market ph --cache-only --limit 5
```

Only for intentional paid calls:

```bash
pnpm seo:serp:rank -- --provider dataforseo --search-market ph --confirm-live --limit 5
pnpm seo:keywords:plan -- --group freediving_guides_ph --provider dataforseo --confirm-live
```

## Paid-Call Safety

- Mock is the default provider.
- DataForSEO without `--confirm-live` is a dry run unless `--cache-only` is used.
- `--cache-only` never performs network calls and fails clearly on cache miss.
- Live DataForSEO SERP runs over 5 keywords require `--allow-over-limit`.
- Live DataForSEO SERP runs over 10 keywords are refused.
- `--refresh` bypasses cache and should be treated as paid when using DataForSEO.
- Credentials are redacted from errors and reports.

## Cache And Reports

Cache files live in:

```txt
scripts/seo/cache
```

Reports live in:

```txt
scripts/seo/reports
```

Generated cache and report files are ignored by git. Keep only `.gitkeep` files committed.

## Search Markets

Search markets are explicit. There is no fake global SERP mode.

Configured markets:

- `ph`: Philippines desktop
- `ph_mobile`: Philippines mobile

Each market has a DataForSEO location code, language, country, and device.

## Recommended FPH Workflow

1. Start local Next dev server.
2. Run `pnpm seo:test`.
3. Run `pnpm seo:audit:mock`.
4. Run a keyword plan with the mock provider.
5. Use cache-only DataForSEO reports first if cache exists.
6. Use confirmed live DataForSEO only when the question is worth paid evidence.
7. Read the Markdown report.
8. Manually edit public content.
9. Rerun the audit.
10. Commit real content improvements, not generated reports.

Do not auto-rewrite content from reports. Do not generate pages from keyword data. Do not treat the score as a ranking score.
