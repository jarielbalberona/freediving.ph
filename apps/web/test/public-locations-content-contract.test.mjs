import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(globalThis.process.cwd());
const sourceRoot = path.join(appRoot, "src");

const readSource = (relativePath) =>
  readFile(path.join(sourceRoot, relativePath), "utf8");

const runTsxFixture = (code) => {
  const result = spawnSync(
    path.join(appRoot, "../../node_modules/.bin/tsx"),
    ["--eval", code],
    {
      cwd: appRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NEXT_PUBLIC_ADSENSE_ENABLED: "",
        NEXT_PUBLIC_ADSENSE_PUBLISHER_ID: "",
        NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT_ID: "",
      },
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
};

const expectedLocationSlugs = [
  "philippines",
  "siquijor",
  "batangas",
  "cebu",
  "dauin",
  "apo-island",
  "panglao",
  "moalboal",
];

test("location index and configured location slugs resolve", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { getLocation, locationBySlug, locationPages, locationRoutes } from "./src/features/public-content/content/locations.ts";

    const expected = ${JSON.stringify(expectedLocationSlugs)};
    assert.deepEqual(locationPages.map((location) => location.slug), expected);
    assert.equal(locationRoutes[0], "/freediving");

    for (const location of locationPages) {
      assert.equal(location.href, \`/freediving/\${location.slug}\`, location.slug);
      assert.equal(locationBySlug.get(location.slug)?.href, location.href, location.slug);
      assert.equal(getLocation(location.slug).slug, location.slug, location.slug);
      assert.ok(location.metaTitle.length >= 30, location.slug);
      assert.ok(location.metaDescription.length >= 100, location.slug);
      assert.ok(location.highlights.length >= 3, location.slug);
      assert.ok(location.bestFor.length >= 3, location.slug);
      assert.ok(location.safetyNotes.length >= 3, location.slug);
      assert.ok(location.gettingStartedTips.length >= 3, location.slug);
      assert.ok(location.relatedGuideSlugs.length >= 3, location.slug);
      assert.ok(location.relatedFeatureSlugs.length >= 3, location.slug);
    }

    assert.throws(() => getLocation("missing-location"), /Missing location content/);
    console.log("ok");
  `);

  assert.equal(output, "ok");
});

test("location route metadata, static params, and not-found contracts are wired", async () => {
  const [indexSource, locationSource, sitemapSource, reservedSource, chromeSource] =
    await Promise.all([
      readSource("app/(public)/freediving/page.tsx"),
      readSource("app/(public)/freediving/[location]/page.tsx"),
      readSource("app/sitemap.ts"),
      readSource("features/profile/utils/reservedSlugs.ts"),
      readSource("components/layout/app-chrome.tsx"),
    ]);

  assert.match(indexSource, /LocationIndexPage/);
  assert.match(indexSource, /buildPublicMetadata/);
  assert.match(indexSource, /path:\s*"\/freediving"/);

  assert.match(locationSource, /generateStaticParams/);
  assert.match(locationSource, /locationPages\.map/);
  assert.match(locationSource, /locationBySlug\.get/);
  assert.match(locationSource, /notFound\(\)/);
  assert.match(locationSource, /title:\s*location\.metaTitle/);
  assert.match(locationSource, /description:\s*location\.metaDescription/);
  assert.match(locationSource, /path:\s*location\.href/);

  assert.match(sitemapSource, /stablePublicRoutes/);
  assert.match(reservedSource, /"freediving"/);
  assert.match(chromeSource, /"\/freediving"/);
});

test("location pages link to guides, features, Explore, and nearby locations", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { featurePageBySlug } from "./src/features/public-content/content/features.ts";
    import { guideBySlug } from "./src/features/public-content/content/guides.ts";
    import { locationBySlug, locationPages } from "./src/features/public-content/content/locations.ts";

    for (const location of locationPages) {
      for (const slug of location.relatedGuideSlugs) {
        assert.ok(guideBySlug.has(slug), \`\${location.slug}: missing guide \${slug}\`);
      }
      for (const slug of location.relatedFeatureSlugs) {
        assert.ok(featurePageBySlug.has(slug), \`\${location.slug}: missing feature \${slug}\`);
      }
      for (const slug of location.nearbyLocationSlugs) {
        assert.ok(locationBySlug.has(slug), \`\${location.slug}: missing nearby location \${slug}\`);
      }
      assert.ok(location.relatedFeatureSlugs.includes("dive-spots"), location.slug);
      assert.ok(location.relatedFeatureSlugs.some((slug) => ["buddy-finder", "events", "groups", "schools-and-courses"].includes(slug)), location.slug);
      assert.equal(location.exploreQuery?.locationSlug, location.slug, location.slug);
      assert.ok(location.exploreQuery?.search, location.slug);
    }

    console.log("ok");
  `);

  assert.equal(output, "ok");
});

test("location copy avoids implementation-facing language", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { locationPages } from "./src/features/public-content/content/locations.ts";

    const blocked = /public layer|location landing module|SEO route|dynamic entity|dynamic section|app surface|content model|location query|query contract|location taxonomy|fallback renderer|API-backed|TODO|Lorem ipsum|developer|component|template|placeholder|coming soon/i;

    for (const location of locationPages) {
      const searchable = [
        location.title,
        location.description,
        location.metaTitle,
        location.metaDescription,
        location.intro,
        ...location.highlights,
        ...location.bestFor,
        ...location.safetyNotes,
        ...location.gettingStartedTips,
      ].join("\\n");
      assert.doesNotMatch(searchable, blocked, location.slug);
    }

    console.log("ok");
  `);

  assert.equal(output, "ok");
});

test("fallback dive spot section is user-facing when no dynamic spots are available", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import React from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import { LocationDiveSpotSection } from "./src/features/public-content/components/LocationDiveSpotSection.tsx";
    import { getLocation } from "./src/features/public-content/content/locations.ts";

    const html = renderToStaticMarkup(
      React.createElement(LocationDiveSpotSection, {
        location: getLocation("siquijor"),
        spots: [],
      }),
    );

    assert.match(html, /No approved dive spots listed here yet/);
    assert.match(html, /Search Explore/);
    assert.match(html, /Contribute a dive spot/);
    assert.doesNotMatch(html, /developer|API-backed|fallback renderer|TODO|placeholder/i);
    console.log("ok");
  `);

  assert.equal(output, "ok");
});

test("approved dynamic dive spot cards render public-safe fields", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import React from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import { LocationDiveSpotSection } from "./src/features/public-content/components/LocationDiveSpotSection.tsx";
    import { getLocation } from "./src/features/public-content/content/locations.ts";

    const html = renderToStaticMarkup(
      React.createElement(LocationDiveSpotSection, {
        location: getLocation("moalboal"),
        spots: [{
          slug: "sardine-run",
          name: "Sardine Run",
          area: "Moalboal, Cebu",
          difficulty: "moderate",
          depthMinM: 5,
          depthMaxM: 18,
          hazards: ["boat traffic", "crowding"],
          verificationStatus: "community",
          lastConditionSummary: "Check current and boat traffic before entering.",
        }],
      }),
    );

    assert.match(html, /Sardine Run/);
    assert.match(html, /Moalboal, Cebu/);
    assert.match(html, /href="\\/explore\\/sites\\/sardine-run"/);
    assert.match(html, /Community shared/);
    assert.doesNotMatch(html, /moderation|pending|rejected|deleted|admin/i);
    console.log("ok");
  `);

  assert.equal(output, "ok");
});

test("dynamic dive spot fetch uses the public Explore location contract without auth", async () => {
  const source = await readSource("features/public-content/lib/locationDiveSpots.ts");

  assert.match(source, /\/v1\/explore\/sites/);
  assert.match(source, /searchParams\.set\("locationSlug"/);
  assert.match(source, /searchParams\.set\("province"/);
  assert.match(source, /searchParams\.set\("municipality"/);
  assert.match(source, /searchParams\.append\("locationAlias"/);
  assert.match(source, /limit", "6"/);
  assert.doesNotMatch(source, /Authorization|Bearer|Clerk|savedOnly|moderation|pending|admin/i);
});

test("backend public Explore contract supports location filters on approved rows", async () => {
  const [handlerSource, serviceSource, repoSource, sqlSource] = await Promise.all([
    readFile(path.join(appRoot, "../../services/fphgo/internal/features/explore/http/handlers.go"), "utf8"),
    readFile(path.join(appRoot, "../../services/fphgo/internal/features/explore/service/service.go"), "utf8"),
    readFile(path.join(appRoot, "../../services/fphgo/internal/features/explore/repo/repo.go"), "utf8"),
    readFile(path.join(appRoot, "../../services/fphgo/internal/features/explore/repo/queries/explore.sql"), "utf8"),
  ]);

  assert.match(handlerSource, /LocationSlug:\s*r\.URL\.Query\(\)\.Get\("locationSlug"\)/);
  assert.match(handlerSource, /LocationAliases:\s*r\.URL\.Query\(\)\["locationAlias"\]/);
  assert.match(serviceSource, /publicExploreLocationAliases/);
  assert.match(serviceSource, /"apo-island":\s*\{"Apo Island", "Apo Island Marine Sanctuary"\}/);
  assert.match(repoSource, /LocationTerms/);
  assert.match(sqlSource, /WHERE s\.moderation_state = 'approved'/);
  assert.match(sqlSource, /sqlc\.arg\(location_terms\)::text\[\]/);
  assert.match(sqlSource, /sqlc\.arg\(province_filter\)::text/);
});
