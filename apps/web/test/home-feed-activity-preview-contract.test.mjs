import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(globalThis.process.cwd());
const homePagePath = path.join(
  appRoot,
  "src/features/home-feed/components/HomeFeedPage.tsx",
);
const appPagePath = path.join(appRoot, "src/app/page.tsx");
const mixedFeedPath = path.join(
  appRoot,
  "src/features/home-feed/components/MixedFeed.tsx",
);
const rendererPath = path.join(
  appRoot,
  "src/features/home-feed/components/FeedItemRenderer.tsx",
);
const feedModeTabsPath = path.join(
  appRoot,
  "src/features/home-feed/components/FeedModeTabs.tsx",
);
const activityClientPath = path.join(
  appRoot,
  "src/features/home-feed/api/get-activity-feed.ts",
);
const homeClientPath = path.join(
  appRoot,
  "src/features/home-feed/api/get-home-feed.ts",
);
const activityHookPath = path.join(
  appRoot,
  "src/features/home-feed/hooks/queries/useActivityFeedQuery.ts",
);
const homeHookPath = path.join(
  appRoot,
  "src/features/home-feed/hooks/queries/useHomeFeedQuery.ts",
);
const routesPath = path.join(appRoot, "src/lib/api/fphgo-routes.ts");
const adapterPath = path.join(
  appRoot,
  "src/features/home-feed/adapters/activity-to-home-feed.ts",
);

test("home feed keeps legacy client while activity feed is the default client", async () => {
  const [routes, homeClient, activityClient, homeHook, activityHook] =
    await Promise.all([
      readFile(routesPath, "utf8"),
      readFile(homeClientPath, "utf8"),
      readFile(activityClientPath, "utf8"),
      readFile(homeHookPath, "utf8"),
      readFile(activityHookPath, "utf8"),
    ]);

  assert.match(routes, /home: \(\) => "\/v1\/feed\/home"/);
  assert.match(routes, /activity: \(\) => "\/v1\/feed\/activity"/);
  assert.match(homeClient, /routes\.v1\.feed\.home\(\)/);
  assert.doesNotMatch(homeClient, /routes\.v1\.feed\.activity\(\)/);
  assert.match(activityClient, /routes\.v1\.feed\.activity\(\)/);
  assert.match(activityClient, /filter: params\.filter/);
  assert.match(activityClient, /mode: params\.mode/);
  assert.match(activityClient, /cursor: params\.cursor/);
  assert.match(activityClient, /region: params\.region/);
  assert.match(homeHook, /queryKey: \["home-feed", "home"/);
  assert.match(activityHook, /"activity-feed"/);
  assert.match(activityHook, /"activity"/);
  assert.doesNotMatch(activityClient, /auth: "ready-only"/);
  assert.match(activityClient, /cache: "no-store"/);
  assert.doesNotMatch(homeClient, /auth: "ready-only"/);
  assert.match(homeClient, /cache: "no-store"/);
});

test("activity source is default and home source is explicit fallback", async () => {
  const [homePage, appPage, feedModeTabs] = await Promise.all([
    readFile(homePagePath, "utf8"),
    readFile(appPagePath, "utf8"),
    readFile(feedModeTabsPath, "utf8"),
  ]);

  assert.match(appPage, /rawFeedSource === "home" \? "home" : "activity"/);
  assert.match(appPage, /initialFeedSource=\{feedSource\}/);
  assert.match(homePage, /initialFeedSource = "activity"/);
  assert.match(homePage, /initialFeedSource === "home" \? "home" : "activity"/);
  assert.match(homePage, /enabled: !usingActivityFeed/);
  assert.match(homePage, /enabled: usingActivityFeed/);
  assert.doesNotMatch(homePage, /Activity feed preview/);
  assert.doesNotMatch(feedModeTabs, /Eligible activity/);
  assert.doesNotMatch(feedModeTabs, /Allowed events/);
});

test("activity preview adapts supported ledger types and skips unknown types safely", async () => {
  const source = await readFile(adapterPath, "utf8");

  assert.match(source, /case "chika_thread_created"/);
  assert.match(source, /case "dive_site_update_added"/);
  assert.match(source, /case "event_published"/);
  assert.match(source, /case "buddy_intent_created"/);
  assert.match(source, /case "media_post_created"/);
  assert.match(source, /return null/);
  assert.match(source, /authorAvatarUrl: item\.actor\.avatarUrl/);
  assert.match(source, /authorPseudonymous: item\.actor\.id\.trim\(\) === ""/);
  assert.doesNotMatch(source, /authorUserId/);
});

test("activity media posts preserve display URLs and avoid caption-only downgrade", async () => {
  const [adapter, card, dialog] = await Promise.all([
    readFile(adapterPath, "utf8"),
    readFile(
      path.join(
        appRoot,
        "src/features/home-feed/components/cards/MediaPostCard.tsx",
      ),
      "utf8",
    ),
    readFile(
      path.join(appRoot, "src/features/media/components/MediaViewerDialog.tsx"),
      "utf8",
    ),
  ]);

  assert.match(adapter, /previewDisplayUrl/);
  assert.match(adapter, /displayUrl: mediaStringValue\(media, "displayUrl"\)/);
  assert.match(adapter, /mediaUnavailableReason/);
  assert.match(card, /previewMediaId && !previewDisplayUrl/);
  assert.match(card, /previewDisplayUrl\s*\?/);
  assert.match(card, /canLinkToProfileUsername\(payload\.authorUsername\)/);
  assert.match(card, /getProfileRoute\(payload\.authorUsername\)\}\/posts/);
  assert.match(card, /href=\{postHref\}/);
  assert.match(card, /avatarUrl=\{payload\.authorAvatarUrl\}/);
  assert.match(card, /authorAvatarUrl=\{payload\.authorAvatarUrl\}/);
  assert.match(card, /<p className="line-clamp-3 text-sm leading-relaxed text-foreground">/);
  assert.doesNotMatch(card, /className="block line-clamp-3 text-sm leading-relaxed text-foreground hover:underline"/);
  assert.match(dialog, /filter\(\(item\) => !item\.displayUrl\)/);
  assert.match(dialog, /needsMintedUrls && dialogUrls\.isPending/);
  assert.match(dialog, /item\.displayUrl \?\?/);
});

test("activity default sends activity-safe telemetry and card actions", async () => {
  const [homePage, mixedFeed, renderer, shell, tracker, adapter] =
    await Promise.all([
      readFile(homePagePath, "utf8"),
      readFile(mixedFeedPath, "utf8"),
      readFile(rendererPath, "utf8"),
      readFile(
        path.join(
          appRoot,
          "src/features/home-feed/components/FeedCardShell.tsx",
        ),
        "utf8",
      ),
      readFile(
        path.join(
          appRoot,
          "src/features/home-feed/hooks/useFeedImpressionTracker.ts",
        ),
        "utf8",
      ),
      readFile(adapterPath, "utf8"),
    ]);

  assert.match(homePage, /source=\{feedSource\}/);
  assert.match(homePage, /telemetryEnabled/);
  assert.match(homePage, /const feedSource: FeedSource =/);
  assert.match(homePage, /initialFeedSource === "home" \? "home" : "activity"/);
  assert.match(mixedFeed, /enabled: telemetryEnabled/);
  assert.match(mixedFeed, /source,/);
  assert.match(
    mixedFeed,
    /entityType: item\.telemetryEntityType \?\? item\.type/,
  );
  assert.match(
    mixedFeed,
    /entityId: item\.telemetryEntityId \?\? item\.entityId/,
  );
  assert.match(mixedFeed, /if \(!telemetryEnabled\) return/);
  assert.match(mixedFeed, /showActions=\{telemetryEnabled\}/);
  assert.match(tracker, /source: params\.source \?\? "home"/);
  assert.match(renderer, /showActions = true/);
  assert.match(renderer, /const actions = showActions \?/);
  assert.match(
    renderer,
    /data-entity-type=\{item\.telemetryEntityType \?\? item\.type\}/,
  );
  assert.match(shell, /FeedTypeBadge/);
  assert.doesNotMatch(shell, /buttonVariants/);
  assert.doesNotMatch(shell, /item\.rankHint/);
  assert.match(adapter, /feedSource: "activity"/);
  assert.match(adapter, /telemetryEntityType: "activity_item"/);
  assert.match(adapter, /telemetryEntityId: item\.id/);
  assert.doesNotMatch(adapter, /Profile update/);
  assert.doesNotMatch(adapter, /Chika thread/);
  assert.doesNotMatch(adapter, /Ordered by recent eligible activity/);
});

test("source, mode, and cursor changes use separate activity pagination state", async () => {
  const source = await readFile(homePagePath, "utf8");

  assert.match(source, /setCursor\(undefined\)/);
  assert.match(source, /\[mode, feedSource\]/);
  assert.match(source, /value: query\.data\.nextCursor/);
  assert.match(source, /source: feedSource/);
  assert.match(
    source,
    /cursor\?\.source === feedSource && cursor\.mode === mode/,
  );
  assert.match(
    source,
    /activityToHomeFeedItems\(activityQuery\.data\?\.items \?\? \[\]\)/,
  );
  assert.match(
    source,
    /itemsState\?\.source === feedSource && itemsState\.mode === mode/,
  );
  assert.match(
    source,
    /const initialLoading = !query\.data && query\.isFetching/,
  );
});
