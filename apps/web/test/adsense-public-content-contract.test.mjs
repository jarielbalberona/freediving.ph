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
        NEXT_PUBLIC_ADSENSE_TEST_MODE: "",
      },
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
};

test("AdSense route matcher allows only segment-safe public SEO paths", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { isAdsenseAllowedPath } from "./src/features/public-content/ads/adsenseRoutes.ts";

    const allowed = [
      "/features",
      "/features/dive-spots",
      "/features/events",
      "/guides",
      "/guides/how-to-start-freediving-in-the-philippines",
      "/blog",
      "/blog/example",
      "/freediving",
      "/freediving/siquijor",
      "/about-us",
    ];

    const blocked = [
      "/",
      "/features-old",
      "/guides-old",
      "/blog-old",
      "/freediving-old",
      "/about-us/team",
      "/events",
      "/events/freediving-philippines-dive-fest",
      "/groups",
      "/groups/example",
      "/chika",
      "/chika/example-thread",
      "/explore",
      "/messages",
      "/profile/me",
      "/settings",
      "/admin",
      "/sign-in",
      "/sign-up",
    ];

    for (const path of allowed) {
      assert.equal(isAdsenseAllowedPath(path), true, path);
    }

    for (const path of blocked) {
      assert.equal(isAdsenseAllowedPath(path), false, path);
    }

    console.log("ok");
  `);

  assert.equal(output, "ok");
});

test("AdSense config no-ops unless enabled and publisher id exists", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import {
      getAdsenseConfig,
      isAdsenseReady,
    } from "./src/features/public-content/ads/adsense.config.ts";

    assert.equal(
      isAdsenseReady(getAdsenseConfig({
        NEXT_PUBLIC_ADSENSE_ENABLED: "false",
        NEXT_PUBLIC_ADSENSE_PUBLISHER_ID: "pub-123",
        NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT_ID: "slot-1",
        NODE_ENV: "production",
      })),
      false,
    );

    assert.equal(
      isAdsenseReady(getAdsenseConfig({
        NEXT_PUBLIC_ADSENSE_ENABLED: "true",
        NEXT_PUBLIC_ADSENSE_PUBLISHER_ID: "",
        NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT_ID: "slot-1",
        NODE_ENV: "production",
      })),
      false,
    );

    const missingSlot = getAdsenseConfig({
      NEXT_PUBLIC_ADSENSE_ENABLED: "true",
      NEXT_PUBLIC_ADSENSE_PUBLISHER_ID: "pub-123",
      NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT_ID: "",
      NODE_ENV: "production",
    });
    assert.equal(isAdsenseReady(missingSlot), true);
    assert.equal(missingSlot.defaultSlotId, "");

    assert.equal(
      getAdsenseConfig({
        NEXT_PUBLIC_ADSENSE_ENABLED: "true",
        NEXT_PUBLIC_ADSENSE_PUBLISHER_ID: "pub-123",
        NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT_ID: "slot-1",
        NEXT_PUBLIC_ADSENSE_TEST_MODE: "true",
        NODE_ENV: "production",
      }).testMode,
      true,
    );

    assert.equal(
      getAdsenseConfig({
        NEXT_PUBLIC_ADSENSE_ENABLED: "true",
        NEXT_PUBLIC_ADSENSE_PUBLISHER_ID: "pub-123",
        NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT_ID: "slot-1",
        NODE_ENV: "development",
      }).testMode,
      true,
    );

    assert.equal(
      getAdsenseConfig({
        NEXT_PUBLIC_ADSENSE_ENABLED: "true",
        NEXT_PUBLIC_ADSENSE_PUBLISHER_ID: "pub-123",
        NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT_ID: "slot-1",
        NEXT_PUBLIC_ADSENSE_TEST_MODE: "false",
        NODE_ENV: "development",
      }).testMode,
      false,
    );

    console.log("ok");
  `);

  assert.equal(output, "ok");
});

test("AdSense script is scoped to public route group layout only", async () => {
  const [rootLayout, publicLayout, appChrome] = await Promise.all([
    readSource("app/layout.tsx"),
    readSource("app/(public)/layout.tsx"),
    readSource("components/layout/app-chrome.tsx"),
  ]);

  assert.doesNotMatch(
    rootLayout,
    /AdsenseScript|adsbygoogle|googlesyndication/,
  );
  assert.doesNotMatch(appChrome, /AdsenseScript|adsbygoogle|googlesyndication/);
  assert.match(
    publicLayout,
    /<AdsenseScript publisherId=\{adsenseConfig\.publisherId\} \/>/,
  );
});

test("AdSense components no-op safely and use official script and slot attributes", async () => {
  const [scriptSource, slotSource, slotClientSource] = await Promise.all([
    readSource("features/public-content/ads/AdsenseScript.tsx"),
    readSource("features/public-content/ads/AdSlot.tsx"),
    readSource("features/public-content/ads/AdSlotClient.tsx"),
  ]);

  assert.match(scriptSource, /next\/script/);
  assert.match(scriptSource, /strategy="afterInteractive"/);
  assert.match(scriptSource, /crossOrigin="anonymous"/);
  assert.match(
    scriptSource,
    /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=/,
  );
  assert.match(scriptSource, /!publisherId/);
  assert.match(scriptSource, /!isAdsenseAllowedPath\(pathname \?\? ""\)/);

  assert.match(slotSource, /!isAdsenseReady\(config\)/);
  assert.match(slotSource, /adSlot\.length === 0/);
  assert.match(slotSource, /<AdSlotClient/);

  assert.match(slotClientSource, /"use client"/);
  assert.match(slotClientSource, /usePathname/);
  assert.match(slotClientSource, /!canRender\) return null/);
  assert.match(
    slotClientSource,
    /window\.adsbygoogle = window\.adsbygoogle \?\? \[\]/,
  );
  assert.match(slotClientSource, /window\.adsbygoogle\.push\(\{\}\)/);
  assert.match(slotClientSource, /catch \{/);
  assert.match(slotClientSource, /data-ad-client=\{publisherId\}/);
  assert.match(slotClientSource, /data-ad-slot=\{slot\}/);
  assert.match(slotClientSource, /data-full-width-responsive/);
  assert.match(
    slotClientSource,
    /data-adtest=\{testMode \? "on" : undefined\}/,
  );
  assert.match(slotSource, /label = "Advertisement"/);
  assert.match(slotClientSource, /\{label\}/);
});

test("Ad slots are placed only in public SEO templates after intro content", async () => {
  const [featureTemplate, featuresIndex, guidesIndex, guideArticle] =
    await Promise.all([
      readSource("features/public-content/components/FeaturePageTemplate.tsx"),
      readSource("app/(public)/features/page.tsx"),
      readSource("app/(public)/guides/page.tsx"),
      readSource("app/(public)/guides/[slug]/page.tsx"),
    ]);

  for (const source of [
    featureTemplate,
    featuresIndex,
    guidesIndex,
    guideArticle,
  ]) {
    assert.match(source, /<AdSlot/);
  }

  assert.ok(
    featureTemplate.indexOf("<PublicHero") < featureTemplate.indexOf("<AdSlot"),
  );
  assert.ok(
    featuresIndex.indexOf("<PublicHero") < featuresIndex.indexOf("<AdSlot"),
  );
  assert.ok(
    guidesIndex.indexOf("<PublicHero") < guidesIndex.indexOf("<AdSlot"),
  );
  assert.ok(guideArticle.indexOf("<h1") < guideArticle.indexOf("<AdSlot"));
});
