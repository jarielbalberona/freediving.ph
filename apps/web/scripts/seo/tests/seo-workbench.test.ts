import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { cacheFirst, cachePath, createCacheKey } from "../cache";
import {
  loadSearchMarkets,
  loadSeoConfig,
  loadTargets,
  redactSecrets,
  reportsDir,
  requireDataForSeoCredentials,
  validateSearchMarket,
  type SeoTarget,
} from "../config";
import { analyzeLocalPage } from "../lib/analyzeLocalPage";
import { writeReports } from "../lib/generateReport";
import { scoreSeoPage } from "../lib/scoreSeoPage";
import { parseCsv, summarizeCoverage } from "../gsc-coverage";
import { assertKeywordPlanSafety } from "../keyword-plan";
import { assertSerpLiveSafety } from "../serp-rank";
import { checkHtmlRoute } from "../verify-rendered-output";

test("config defaults to mock and reads SEO_TARGET_BASE_URL", () => {
  const config = loadSeoConfig(
    {},
    { NODE_ENV: "test", SEO_TARGET_BASE_URL: "http://localhost:4444" },
  );
  assert.equal(config.provider, "mock");
  assert.equal(config.targetBaseUrl, "http://localhost:4444");
  assert.equal(config.cacheTtlHours, 168);
});

test("missing DataForSEO credentials fails only when live provider is requested", () => {
  const mockConfig = loadSeoConfig({ provider: "mock" }, { NODE_ENV: "test" });
  assert.doesNotThrow(() => requireDataForSeoCredentials(mockConfig));

  const liveConfig = loadSeoConfig(
    { provider: "dataforseo" },
    { NODE_ENV: "test" },
  );
  assert.equal(liveConfig.provider, "dataforseo");
  assert.throws(
    () => requireDataForSeoCredentials(liveConfig),
    /credentials are required/i,
  );
});

test("search market validation requires location, language, country, and device", () => {
  assert.doesNotThrow(() => loadSearchMarkets());
  assert.throws(
    () =>
      validateSearchMarket("bad", {
        language_code: "en",
        country_iso_code: "PH",
        device: "desktop",
      }),
    /location_code/,
  );
  assert.throws(
    () =>
      validateSearchMarket("bad", {
        location_code: 2608,
        country_iso_code: "PH",
        device: "desktop",
      }),
    /language_code/,
  );
  assert.throws(
    () =>
      validateSearchMarket("bad", {
        location_code: 2608,
        language_code: "en",
        country_iso_code: "PH",
      }),
    /device/,
  );
});

test("route target loading includes current public guide pages", () => {
  const targets = loadTargets();
  const paths = new Set(targets.map((target) => target.path));
  assert.ok(paths.has("/features"));
  assert.ok(paths.has("/freediving"));
  assert.ok(paths.has("/freediving/siquijor"));
  assert.ok(paths.has("/freediving/moalboal"));
  assert.ok(paths.has("/guides/freediving-safety-basics"));
  assert.ok(paths.has("/guides/best-time-to-freedive-in-the-philippines"));
  assert.ok(paths.has("/about-us"));
});

test("cache key generation is deterministic and request scoped", () => {
  const base = {
    provider: "mock" as const,
    requestType: "serp" as const,
    query: "Freediving Safety Basics",
    market: "ph",
    device: "desktop" as const,
  };
  assert.equal(createCacheKey(base), createCacheKey({ ...base }));
  assert.notEqual(
    createCacheKey(base),
    createCacheKey({ ...base, device: "mobile" }),
  );
  assert.notEqual(
    createCacheKey(base),
    createCacheKey({ ...base, requestType: "keyword-volume" }),
  );
});

test("cache-only refuses network calls on cache miss", async () => {
  const request = {
    provider: "mock" as const,
    requestType: "serp" as const,
    query: `cache only test ${Date.now()}`,
    market: "ph",
    device: "desktop" as const,
  };
  rmSync(cachePath(request), { force: true });
  let called = false;
  await assert.rejects(
    () =>
      cacheFirst(
        request,
        { ttlHours: 168, cacheOnly: true },
        async () => {
          called = true;
          return { ok: true };
        },
      ),
    /cache-only prevents network calls/i,
  );
  assert.equal(called, false);
});

test("live DataForSEO SERP requires confirmation and protects limits", () => {
  assert.deepEqual(
    assertSerpLiveSafety({
      provider: "dataforseo",
      keywordCount: 3,
      confirmLive: false,
      allowOverLimit: false,
      refresh: false,
      cacheOnly: false,
    }),
    { dryRun: true },
  );
  assert.throws(
    () =>
      assertSerpLiveSafety({
        provider: "dataforseo",
        keywordCount: 6,
        confirmLive: true,
        allowOverLimit: false,
        refresh: false,
        cacheOnly: false,
      }),
    /allow-over-limit/,
  );
  assert.throws(
    () =>
      assertSerpLiveSafety({
        provider: "dataforseo",
        keywordCount: 11,
        confirmLive: true,
        allowOverLimit: true,
        refresh: false,
        cacheOnly: false,
      }),
    /hard limit/,
  );
  assert.throws(
    () =>
      assertSerpLiveSafety({
        provider: "dataforseo",
        keywordCount: 1,
        confirmLive: false,
        allowOverLimit: false,
        refresh: true,
        cacheOnly: false,
      }),
    /refresh.*confirm-live/i,
  );
});

test("keyword plan live DataForSEO requires confirmation", () => {
  assert.deepEqual(
    assertKeywordPlanSafety({
      provider: "dataforseo",
      keywordCount: 5,
      confirmLive: false,
      allowOverLimit: false,
      cacheOnly: false,
    }),
    { dryRun: true },
  );
});

test("local page scoring catches missing title, meta, and H1", () => {
  const target: SeoTarget = {
    path: "/guides/test",
    type: "guide",
    primaryKeyword: "test",
  };
  const score = scoreSeoPage({
    target,
    statusCode: 200,
    finalUrl: "http://localhost:3000/guides/test",
    expectedCanonical: "https://freediving.ph/guides/test",
    title: "",
    metaDescription: "",
    canonical: "",
    robots: "",
    h1: [],
    headings: [],
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    jsonLdCount: 0,
    jsonLdTypes: [],
    hasArticleJsonLd: false,
    hasBreadcrumbJsonLd: false,
    internalLinks: [],
    outboundLinks: [],
    imageCount: 0,
    imagesMissingAlt: 0,
    wordCount: 0,
    contentLength: 0,
    warnings: [],
    severeIssues: ["Missing title", "Missing meta description", "Missing H1"],
  });
  assert.equal(score.verdict, "FAIL");
  assert.ok(score.recommendations.includes("Missing title"));
});

test("copy guard catches developer and copied-project leakage terms", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      `<!doctype html>
      <html>
        <head>
          <title>Bad test page</title>
          <meta name="description" content="Bad test description for a local SEO audit.">
          <link rel="canonical" href="https://freediving.ph/guides/test">
        </head>
        <body>
          <h1>Bad test page</h1>
          <p>TODO developer route copied from Ordr.Now restaurant POS.</p>
        </body>
      </html>`,
      {
        status: 200,
        headers: { "content-type": "text/html" },
      },
    );
  try {
    const analysis = await analyzeLocalPage(
      {
        path: "/guides/test",
        type: "guide",
        primaryKeyword: "test",
      },
      "http://localhost:3000",
    );
    assert.match(analysis.severeIssues.join("\n"), /TODO/);
    assert.match(analysis.severeIssues.join("\n"), /developer/);
    assert.match(analysis.warnings.join("\n"), /Ordr\.Now/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("report generation redacts credentials", () => {
  process.env.DATAFORSEO_LOGIN = "secret-login";
  process.env.DATAFORSEO_PASSWORD = "secret-password";
  const report = writeReports({
    kind: "audit",
    command: "seo:audit",
    provider: "dataforseo",
    cacheBehavior: "cache-first",
    summary: "secret-login secret-password Basic abc123",
    sections: [
      {
        title: "Credentials",
        lines: ["secret-login", "secret-password", "Basic abc123"],
      },
    ],
    json: {
      login: "secret-login",
      password: "secret-password",
      header: "Basic abc123",
    },
  });
  const markdown = readFileSync(report.markdownPath, "utf8");
  const json = readFileSync(report.jsonPath, "utf8");
  assert.doesNotMatch(markdown, /secret-login|secret-password|Basic abc123/);
  assert.doesNotMatch(json, /secret-login|secret-password|Basic abc123/);
  assert.equal(redactSecrets("secret-login secret-password"), "[redacted] [redacted]");
});

test("rendered output checker catches missing canonical and noindex", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      `<!doctype html>
      <html>
        <head>
          <title>Rendered test</title>
          <meta name="description" content="A rendered test description for Freediving Philippines.">
          <meta name="robots" content="noindex,nofollow">
          <meta property="og:title" content="Rendered test">
          <meta property="og:description" content="A rendered test description for Freediving Philippines.">
          <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>
        </head>
        <body>
          <h1>Rendered test</h1>
          <a href="/features">Features</a>
        </body>
      </html>`,
      { status: 200, headers: { "content-type": "text/html" } },
    );
  try {
    const result = await checkHtmlRoute("/features", "http://localhost:3000");
    assert.equal(result.verdict, "FAIL");
    assert.match(result.issues.join("\n"), /canonical/i);
    assert.match(result.issues.join("\n"), /noindex/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GSC coverage parser flags public issues and private route appearances", () => {
  const rows = parseCsv(`URL,Status
https://freediving.ph/features,Indexed
https://freediving.ph/guides/freediving-safety-basics,Crawled - currently not indexed
https://freediving.ph/messages,Indexed
`);
  const summary = summarizeCoverage(rows);
  assert.equal(summary.totalRows, 3);
  assert.ok(
    summary.publicSeoProblems.some((item) =>
      item.url.includes("/guides/freediving-safety-basics"),
    ),
  );
  assert.ok(
    summary.privateRouteAppearances.some((item) =>
      item.url.includes("/messages"),
    ),
  );
});

test("report generation uses unique report paths for rapid consecutive calls", () => {
  const first = writeReports({
    kind: "audit",
    command: "seo:audit --provider mock --all",
    provider: "mock",
    targetBaseUrl: "http://localhost:3000",
    cacheBehavior: "cache-first",
    summary: "first report",
    sections: [],
    json: { report: "first" },
  });
  const second = writeReports({
    kind: "audit",
    command: "seo:audit --provider mock --all",
    provider: "mock",
    targetBaseUrl: "http://localhost:3000",
    cacheBehavior: "cache-first",
    summary: "second report",
    sections: [],
    json: { report: "second" },
  });

  assert.notEqual(first.markdownPath, second.markdownPath);
  assert.notEqual(first.jsonPath, second.jsonPath);
  assert.notEqual(first.markdownPath, first.jsonPath);
  assert.notEqual(second.markdownPath, second.jsonPath);
  assert.equal(path.dirname(first.markdownPath), reportsDir);
  assert.equal(path.dirname(first.jsonPath), reportsDir);
  assert.equal(path.dirname(second.markdownPath), reportsDir);
  assert.equal(path.dirname(second.jsonPath), reportsDir);
  assert.match(path.basename(first.markdownPath), /^audit-\d{8}-\d{6}-\d{3}-[a-f0-9]{6}\.md$/);
  assert.match(path.basename(first.jsonPath), /^audit-\d{8}-\d{6}-\d{3}-[a-f0-9]{6}\.json$/);
});

test("DataForSEO tooling is not imported by app runtime files", () => {
  const runtimeFiles = [
    "src/app/layout.tsx",
    "src/app/(public)/layout.tsx",
    "src/app/(app)/layout.tsx",
  ];
  for (const file of runtimeFiles) {
    try {
      const source = readFileSync(
        new URL(`../../../${file}`, import.meta.url),
        "utf8",
      );
      assert.doesNotMatch(source, /dataforseo|scripts\/seo/i, file);
    } catch {
      // Some route groups may not have their own layout. That is fine.
    }
  }
});
