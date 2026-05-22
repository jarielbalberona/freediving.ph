import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");

const readSource = (relativePath) =>
  readFile(path.join(repoRoot, relativePath), "utf8");

test("SEO system assets are implemented as App Router metadata routes", async () => {
  const [robotsSource, sitemapSource, reservedSlugsSource] = await Promise.all([
    readSource("src/app/robots.ts"),
    readSource("src/app/sitemap.ts"),
    readSource("src/features/profile/utils/reservedSlugs.ts"),
  ]);

  assert.match(
    robotsSource,
    /sitemap:\s*`\$\{siteConfig\.url\}\/sitemap\.xml`/,
  );
  assert.match(sitemapSource, /stablePublicRoutes/);
  assert.match(sitemapSource, /\/explore/);

  for (const slug of [
    "robots.txt",
    "sitemap.xml",
    "sitemap-index.xml",
    "favicon.ico",
    "manifest.json",
    "opengraph-image",
    "twitter-image",
  ]) {
    assert.match(reservedSlugsSource, new RegExp(`"${slug}"`));
  }
});

test("group, event, and chika SEO URLs use slug detail paths", async () => {
  const [sitemapSource, groupPageSource, eventPageSource, chikaPageSource] =
    await Promise.all([
      readSource("src/app/sitemap.ts"),
      readSource("src/app/groups/[slug]/page.tsx"),
      readSource("src/app/events/[slug]/page.tsx"),
      readSource("src/app/chika/[slug]/page.tsx"),
    ]);

  assert.match(
    sitemapSource,
    /\/groups\/\$\{encodeURIComponent\(group\.slug\)\}/,
  );
  assert.match(
    sitemapSource,
    /\/events\/\$\{encodeURIComponent\(event\.slug\)\}/,
  );
  assert.match(
    sitemapSource,
    /\/chika\/\$\{encodeURIComponent\(thread\.slug\)\}/,
  );
  assert.doesNotMatch(
    sitemapSource,
    /\/groups\/\$\{encodeURIComponent\(group\.id\)\}/,
  );
  assert.doesNotMatch(
    sitemapSource,
    /\/events\/\$\{encodeURIComponent\(event\.id\)\}/,
  );
  assert.doesNotMatch(
    sitemapSource,
    /\/chika\/\$\{encodeURIComponent\(thread\.id\)\}/,
  );
  assert.doesNotMatch(
    sitemapSource,
    /\/(?:groups|events|chika)\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/,
  );

  for (const [source, path] of [
    [groupPageSource, "groups"],
    [eventPageSource, "events"],
    [chikaPageSource, "chika"],
  ]) {
    assert.match(
      source,
      new RegExp(`/${path}/\\$\\{encodeURIComponent\\(slug\\)\\}`),
    );
    assert.match(source, /alternates:\s*\{\s*canonical\s*\}/);
    assert.match(source, /url:\s*canonical/);
    assert.doesNotMatch(
      source,
      new RegExp(`/${path}/\\$\\{encodeURIComponent\\(id\\)\\}`),
    );
  }
});

test("Google tag and Sentry tooling are wired and Vercel Analytics is removed", async () => {
  const [layoutSource, packageJsonSource, sentryClientSource] =
    await Promise.all([
      readSource("src/app/layout.tsx"),
      readSource("package.json"),
      readSource("sentry.client.config.ts"),
    ]);

  assert.match(layoutSource, /G-2ML3MWBFD8/);
  assert.match(layoutSource, /googletagmanager\.com\/gtag\/js/);
  assert.match(layoutSource, /gtag\('config', '\$\{googleAnalyticsId\}'\)/);
  assert.match(layoutSource, /NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION/);
  assert.match(layoutSource, /verification:/);
  assert.match(sentryClientSource, /NEXT_PUBLIC_SENTRY_DSN/);
  assert.match(sentryClientSource, /app\.glitchtip\.com\/23656/);
  assert.match(sentryClientSource, /tracesSampleRate:\s*0\.01/);
  assert.match(sentryClientSource, /replaysSessionSampleRate:\s*0/);
  assert.doesNotMatch(packageJsonSource, /@vercel\/analytics/);
});
