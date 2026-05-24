import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(globalThis.process.cwd());
const sourceRoot = path.join(appRoot, "src");

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

const blockedVisibleCopy =
  /public layer|content layer|app route|feature page|SEO page|metadata helper|JSON-LD helper|structured data helper|developer|component|template|TODO|Lorem ipsum|placeholder|coming soon|platform enables|allows users|users can|real app surfaces|app surfaces|event surface|Explore surface|schools layer|public content layer|app concepts|CMS exists/i;

test("public feature and guide content uses user-facing copy", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { featurePages } from "./src/features/public-content/content/features.ts";
    import { publishedGuides } from "./src/features/public-content/content/guides.ts";
    import { locationPages } from "./src/features/public-content/content/locations.ts";

    const blocked = ${blockedVisibleCopy};

    for (const feature of featurePages) {
      const searchable = [
        feature.title,
        feature.shortTitle,
        feature.description,
        feature.eyebrow,
        feature.appLabel,
        feature.summary,
        ...feature.highlights,
        ...feature.sections.flatMap((section) => [section.title, section.body]),
        ...feature.relatedLinks.flatMap((link) => [link.label, link.description]),
      ].join("\\n");
      assert.doesNotMatch(searchable, blocked, feature.slug);
    }

    for (const guide of publishedGuides) {
      const searchable = [
        guide.title,
        guide.description,
        ...(guide.sections ?? []).flatMap((section) => [
          section.title,
          ...section.body,
          ...(section.bullets ?? []),
          ...(section.checklist ?? []),
          ...(section.links ?? []).flatMap((link) => [link.label]),
        ]),
        ...(guide.relatedLinks ?? []).flatMap((link) => [link.label]),
      ].join("\\n");
      assert.doesNotMatch(searchable, blocked, guide.slug);
    }

    for (const location of locationPages) {
      const searchable = [
        location.name,
        location.regionLabel ?? "",
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

test("public page source strings avoid implementation-facing copy", async () => {
  const files = [
    "app/(public)/features/page.tsx",
    "app/(public)/guides/page.tsx",
    "app/(public)/guides/[slug]/page.tsx",
    "app/(public)/freediving/page.tsx",
    "app/(public)/freediving/[location]/page.tsx",
    "app/(public)/about-us/page.tsx",
    "features/public-content/components/PublicCTA.tsx",
    "features/public-content/components/PublicHero.tsx",
    "features/public-content/components/PublicContentLayout.tsx",
    "features/public-content/components/FeaturePageTemplate.tsx",
    "features/public-content/components/LocationIndexPage.tsx",
    "features/public-content/components/LocationLandingPage.tsx",
    "features/public-content/components/LocationDiveSpotSection.tsx",
  ];

  for (const file of files) {
    const source = await readFile(path.join(sourceRoot, file), "utf8");
    const visibleStrings = source
      .split("\\n")
      .filter((line) => !line.trimStart().startsWith("import "))
      .filter((line) => !line.includes("className="))
      .flatMap((line) =>
        [...line.matchAll(/["'`]([^"'`]*[A-Za-z][^"'`]*)["'`]/g)].map(
          (match) => match[1],
        ),
      )
      .join("\\n");
    assert.doesNotMatch(visibleStrings, blockedVisibleCopy, file);
  }
});
