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

test("Google and Sentry tooling are env-driven and Vercel Analytics is removed", async () => {
  const [analyticsSource, layoutSource, packageJsonSource, sentryClientSource] =
    await Promise.all([
      readSource("src/components/google-analytics.tsx"),
      readSource("src/app/layout.tsx"),
      readSource("package.json"),
      readSource("sentry.client.config.ts"),
    ]);

  assert.match(analyticsSource, /NEXT_PUBLIC_GTM_ID/);
  assert.match(analyticsSource, /NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  assert.match(analyticsSource, /googletagmanager\.com/);
  assert.match(layoutSource, /NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION/);
  assert.match(layoutSource, /verification:/);
  assert.match(sentryClientSource, /NEXT_PUBLIC_SENTRY_DSN/);
  assert.doesNotMatch(packageJsonSource, /@vercel\/analytics/);
});
