import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
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

test("AI-readable registry covers stable public SEO content only", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { aiReadableEntries } from "./src/features/public-content/ai-readable/registry.ts";
    import { featurePages } from "./src/features/public-content/content/features.ts";
    import { publishedGuides } from "./src/features/public-content/content/guides.ts";
    import { locationPages } from "./src/features/public-content/content/locations.ts";

    const htmlPaths = new Set(aiReadableEntries.map((entry) => entry.htmlPath));
    const markdownPaths = new Set(aiReadableEntries.map((entry) => entry.markdownPath));

    assert.ok(htmlPaths.has("/features"));
    assert.ok(htmlPaths.has("/guides"));
    assert.ok(htmlPaths.has("/freediving"));
    assert.ok(htmlPaths.has("/about-us"));

    for (const feature of featurePages) {
      assert.ok(htmlPaths.has(feature.href), feature.href);
      assert.ok(markdownPaths.has(\`\${feature.href}.md\`), feature.href);
    }
    for (const guide of publishedGuides) {
      assert.ok(htmlPaths.has(guide.href), guide.href);
      assert.ok(markdownPaths.has(\`\${guide.href}.md\`), guide.href);
    }
    for (const location of locationPages) {
      assert.ok(htmlPaths.has(location.href), location.href);
      assert.ok(markdownPaths.has(\`\${location.href}.md\`), location.href);
    }

    for (const entry of aiReadableEntries) {
      assert.ok(entry.htmlPath.startsWith("/"));
      assert.ok(entry.markdownPath.endsWith(".md"));
      assert.doesNotMatch(entry.htmlPath, /admin|messages|settings|sign-in|sign-up|booking|payment/);
      assert.doesNotMatch(entry.markdownPath, /admin|messages|settings|sign-in|sign-up|booking|payment/);
    }

    console.log("ok");
  `);

  assert.equal(output, "ok");
});

test("llms.txt output lists public HTML and Markdown alternates", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { GET } from "./src/app/llms.txt/route.ts";

    async function main() {
      const response = GET();
      const text = await response.text();

      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") ?? "", /text\\/plain/);
      assert.match(text, /# Freediving Philippines/);
      assert.match(text, /Canonical site: https:\\/\\/freediving\\.ph/);
      assert.match(text, /https:\\/\\/freediving\\.ph\\/features/);
      assert.match(text, /https:\\/\\/freediving\\.ph\\/features\\.md/);
      assert.match(text, /https:\\/\\/freediving\\.ph\\/guides\\/freediving-safety-basics\\.md/);
      assert.match(text, /https:\\/\\/freediving\\.ph\\/freediving\\/siquijor\\.md/);
      assert.doesNotMatch(text, /DataForSEO|reports|cache|gsc|admin|messages|settings|sign-in|sign-up/i);

      console.log("ok");
    }

    main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `);

  assert.equal(output, "ok");
});

test("all registered Markdown alternates have concrete App Router handlers", async () => {
  const output = runTsxFixture(`
    import { aiReadableEntries } from "./src/features/public-content/ai-readable/registry.ts";
    console.log(JSON.stringify(aiReadableEntries.map((entry) => entry.markdownPath)));
  `);
  const markdownPaths = JSON.parse(output);

  await stat(path.join(sourceRoot, "app/llms.txt/route.ts"));
  for (const markdownPath of markdownPaths) {
    const routePath = path.join(
      sourceRoot,
      "app/(public)",
      markdownPath,
      "route.ts",
    );
    await stat(routePath);
  }
});

test("Markdown route handlers return markdown with canonical HTML URLs", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { GET as featuresIndex } from "./src/app/(public)/features.md/route.ts";
    import { GET as featureDetail } from "./src/app/(public)/features/dive-spots.md/route.ts";
    import { GET as guidesIndex } from "./src/app/(public)/guides.md/route.ts";
    import { GET as guideDetail } from "./src/app/(public)/guides/freediving-safety-basics.md/route.ts";
    import { GET as locationsIndex } from "./src/app/(public)/freediving.md/route.ts";
    import { GET as locationDetail } from "./src/app/(public)/freediving/siquijor.md/route.ts";
    import { GET as about } from "./src/app/(public)/about-us.md/route.ts";

    async function main() {
      const cases = [
        [featuresIndex(), "https://freediving.ph/features"],
        [featureDetail(), "https://freediving.ph/features/dive-spots"],
        [guidesIndex(), "https://freediving.ph/guides"],
        [guideDetail(), "https://freediving.ph/guides/freediving-safety-basics"],
        [locationsIndex(), "https://freediving.ph/freediving"],
        [locationDetail(), "https://freediving.ph/freediving/siquijor"],
        [about(), "https://freediving.ph/about-us"],
      ];

      const blocked = /public layer|content layer|SEO page|app route|feature page|dynamic entity|dynamic section|location query|query contract|location taxonomy|API-backed|fallback renderer|metadata helper|JSON-LD helper|structured data helper|TODO|Lorem ipsum|placeholder|developer|DataForSEO|generated report|Search Console export/i;

      for (const [responseOrPromise, canonical] of cases) {
        const response = await responseOrPromise;
        const text = await response.text();
        assert.equal(response.status, 200, canonical);
        assert.match(response.headers.get("content-type") ?? "", /text\\/markdown/, canonical);
        assert.ok(text.includes(\`Canonical: \${canonical}\`), canonical);
        assert.match(text, /^# /, canonical);
        assert.doesNotMatch(text, blocked, canonical);
        assert.doesNotMatch(text, /\\/admin|\\/messages|\\/settings|\\/sign-in|\\/sign-up/, canonical);
      }

      console.log("ok");
    }

    main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `);

  assert.equal(output, "ok");
});

test("missing Markdown slugs return 404", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { featureMarkdownRoute, guideMarkdownRoute, locationMarkdownRoute } from "./src/features/public-content/ai-readable/routeFactories.ts";

    async function main() {
      const responses = [
        featureMarkdownRoute("missing"),
        guideMarkdownRoute("missing"),
        locationMarkdownRoute("missing"),
      ];

      for (const response of responses) {
        assert.equal(response.status, 404);
      }

      console.log("ok");
    }

    main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  `);

  assert.equal(output, "ok");
});

test("metadata helper advertises markdown alternates without changing sitemap inclusion", async () => {
  const [metadataSource, sitemapSource, robotsSource, reservedSlugsSource] =
    await Promise.all([
      readSource("features/public-content/seo/metadata.ts"),
      readSource("app/sitemap.ts"),
      readSource("app/robots.ts"),
      readSource("features/profile/utils/reservedSlugs.ts"),
    ]);

  assert.match(metadataSource, /"text\/markdown"/);
  assert.match(metadataSource, /getMarkdownAlternatePath/);
  assert.doesNotMatch(sitemapSource, /\.md/);
  assert.doesNotMatch(robotsSource, /Disallow:\s*\/llms\.txt/i);

  for (const slug of ["llms.txt", "features.md", "guides.md", "freediving.md", "about-us.md"]) {
    assert.match(reservedSlugsSource, new RegExp(`"${slug}"`));
  }
});
