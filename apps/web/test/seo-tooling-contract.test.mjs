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

  assert.match(robotsSource, /sitemap:\s*`\$\{siteConfig\.url\}\/sitemap\.xml`/);
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
  assert.doesNotMatch(packageJsonSource, /@vercel\/analytics/);
});
