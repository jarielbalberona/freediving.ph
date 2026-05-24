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

const expectedGuideSlugs = [
  "how-to-start-freediving-in-the-philippines",
  "freediving-safety-basics",
  "what-to-bring-to-a-freediving-session",
  "how-to-find-a-freediving-buddy",
  "freediving-certifications-philippines",
  "best-time-to-freedive-in-the-philippines",
];

test("guides index includes the Phase 2 published guide set", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { guides, publishedGuides } from "./src/features/public-content/content/guides.ts";

    const expected = ${JSON.stringify(expectedGuideSlugs)};

    assert.deepEqual(
      publishedGuides.map((guide) => guide.slug),
      expected,
    );
    assert.equal(guides.length, expected.length);

    for (const guide of publishedGuides) {
      assert.equal(guide.status, "published", guide.slug);
      assert.equal(guide.href, \`/guides/\${guide.slug}\`, guide.slug);
      assert.ok(guide.title.length > 20, guide.slug);
      assert.ok(guide.description.length >= 90, guide.slug);
      assert.ok(guide.readingTime, guide.slug);
      assert.ok(guide.publishedAt, guide.slug);
      assert.ok(guide.updatedAt, guide.slug);
      assert.ok((guide.sections?.length ?? 0) >= 4, guide.slug);
      assert.ok((guide.sections?.length ?? 0) <= 7, guide.slug);
      assert.ok((guide.relatedLinks?.length ?? 0) >= 3, guide.slug);
    }

    console.log("ok");
  `);

  assert.equal(output, "ok");
});

test("guide slugs resolve and missing guide slugs are not published", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { guideBySlug, getGuide, publishedGuides } from "./src/features/public-content/content/guides.ts";

    for (const guide of publishedGuides) {
      assert.equal(guideBySlug.get(guide.slug)?.href, guide.href, guide.slug);
      assert.equal(getGuide(guide.slug).slug, guide.slug, guide.slug);
    }

    assert.equal(guideBySlug.has("missing-guide"), false);
    assert.throws(() => getGuide("missing-guide"), /Missing guide content/);

    console.log("ok");
  `);

  assert.equal(output, "ok");
});

test("guide copy avoids filler and developer-facing language", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { publishedGuides } from "./src/features/public-content/content/guides.ts";

    const blocked = /TODO|Lorem ipsum|developer|route|component|placeholder|coming soon/i;

    for (const guide of publishedGuides) {
      const searchable = [
        guide.title,
        guide.description,
        ...(guide.sections ?? []).flatMap((section) => [
          section.title,
          ...section.body,
          ...(section.bullets ?? []),
          ...(section.checklist ?? []),
          ...(section.links ?? []).flatMap((link) => [link.label, link.href]),
        ]),
        ...(guide.relatedLinks ?? []).flatMap((link) => [link.label, link.href]),
      ].join("\\n");

      assert.doesNotMatch(searchable, blocked, guide.slug);
      assert.doesNotMatch(searchable, /clicking this|this page helps SEO|platform provides functionality/i, guide.slug);
    }

    console.log("ok");
  `);

  assert.equal(output, "ok");
});

test("guide pages keep metadata, sitemap, and not-found contracts wired", async () => {
  const [guidePageSource, guidesIndexSource, sitemapSource] = await Promise.all(
    [
      readSource("app/(public)/guides/[slug]/page.tsx"),
      readSource("app/(public)/guides/page.tsx"),
      readSource("app/sitemap.ts"),
    ],
  );

  assert.match(guidePageSource, /generateStaticParams/);
  assert.match(guidePageSource, /publishedGuides\.map/);
  assert.match(guidePageSource, /guide\.status !== "published"/);
  assert.match(guidePageSource, /notFound\(\)/);
  assert.match(guidePageSource, /buildPublicMetadata/);
  assert.match(guidePageSource, /title:\s*guide\.title/);
  assert.match(guidePageSource, /description:\s*guide\.description/);
  assert.match(guidePageSource, /path:\s*guide\.href/);
  assert.match(guidePageSource, /type:\s*"article"/);
  assert.match(guidePageSource, /articleJsonLd/);
  assert.match(guidePageSource, /In this guide/);

  assert.match(guidesIndexSource, /publishedGuides\.map/);
  assert.doesNotMatch(guidesIndexSource, /Coming soon|Planned topic|Phase 1/);

  assert.match(sitemapSource, /publishedGuides\.map\(\(guide\) => guide\.href\)/);
});

test("published guides link to useful internal next steps", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { featurePages } from "./src/features/public-content/content/features.ts";
    import { publishedGuides } from "./src/features/public-content/content/guides.ts";

    const guideHrefs = new Set(publishedGuides.map((guide) => guide.href));
    const featureHrefs = new Set(["/features", ...featurePages.map((feature) => feature.href)]);
    const appHrefs = new Set(["/explore", "/events", "/groups", "/chika", "/sign-up"]);

    for (const guide of publishedGuides) {
      const links = [
        ...(guide.relatedLinks ?? []),
        ...(guide.sections ?? []).flatMap((section) => section.links ?? []),
      ];
      assert.ok(links.length >= 3, guide.slug);

      for (const link of links) {
        assert.ok(link.href.startsWith("/"), \`\${guide.slug}: \${link.href}\`);
        assert.ok(
          guideHrefs.has(link.href) ||
            featureHrefs.has(link.href) ||
            appHrefs.has(link.href),
          \`\${guide.slug}: unexpected link \${link.href}\`,
        );
      }
    }

    console.log("ok");
  `);

  assert.equal(output, "ok");
});
