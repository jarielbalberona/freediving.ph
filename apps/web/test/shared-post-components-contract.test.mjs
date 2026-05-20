import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(globalThis.process.cwd());

const readSource = (relativePath) =>
  readFile(path.join(appRoot, relativePath), "utf8");

const runTsxFixture = (code) => {
  const result = spawnSync(path.join(appRoot, "../../node_modules/.bin/tsx"), ["--eval", code], {
    cwd: appRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
};

test("chika vote transition math covers every click path", async () => {
  const source = await readSource("src/features/chika/lib/vote-state.ts");

  assert.match(source, /upvote:\s*1/);
  assert.match(source, /downvote:\s*-1/);
  assert.match(source, /none:\s*0/);
  assert.match(source, /nextVoteForClick/);
  assert.match(source, /current === clicked \? null : clicked/);
  assert.match(source, /voteDelta\(current\.viewerVote, viewerVote\)/);

  const score = { upvote: 1, downvote: -1, none: 0 };
  const nextVoteForClick = (current, clicked) => (current === clicked ? null : clicked);
  const apply = (state, clicked) => {
    const nextVote = nextVoteForClick(state.viewerVote, clicked);
    return {
      voteScore:
        state.voteScore + score[nextVote ?? "none"] - score[state.viewerVote ?? "none"],
      viewerVote: nextVote,
    };
  };

  assert.deepEqual(apply({ voteScore: 10, viewerVote: null }, "upvote"), {
    voteScore: 11,
    viewerVote: "upvote",
  });
  assert.deepEqual(apply({ voteScore: 10, viewerVote: null }, "downvote"), {
    voteScore: 9,
    viewerVote: "downvote",
  });
  assert.deepEqual(apply({ voteScore: 10, viewerVote: "upvote" }, "upvote"), {
    voteScore: 9,
    viewerVote: null,
  });
  assert.deepEqual(apply({ voteScore: 10, viewerVote: "downvote" }, "downvote"), {
    voteScore: 11,
    viewerVote: null,
  });
  assert.deepEqual(apply({ voteScore: 10, viewerVote: "upvote" }, "downvote"), {
    voteScore: 8,
    viewerVote: "downvote",
  });
  assert.deepEqual(apply({ voteScore: 10, viewerVote: "downvote" }, "upvote"), {
    voteScore: 12,
    viewerVote: "upvote",
  });
});

test("home and chika list surfaces render through shared post components", async () => {
  const [renderer, chikaThreads, exploreTabs] = await Promise.all([
    readSource("src/features/home-feed/components/FeedItemRenderer.tsx"),
    readSource("src/app/chika/threads.tsx"),
    readSource("src/app/explore/sites/[slug]/dive-site-related-tabs.tsx"),
  ]);

  assert.match(renderer, /MediaPostComponent/);
  assert.match(renderer, /mediaPostFromHomeFeedItem/);
  assert.match(renderer, /ChikaPostComponent/);
  assert.match(renderer, /chikaPostFromHomeFeedItem/);
  assert.doesNotMatch(renderer, /MediaPostCard/);
  assert.doesNotMatch(renderer, /CommunityHotCard/);

  assert.match(chikaThreads, /ChikaPostComponent/);
  assert.match(chikaThreads, /chikaPostFromThread/);
  assert.doesNotMatch(chikaThreads, /<Card/);
  assert.match(exploreTabs, /FeedItemRenderer/);
});

test("chika display adapters preserve identity and excerpt contracts", async () => {
  const [displayAdapter, component, activityAdapter] = await Promise.all([
    readSource("src/features/chika/types/post-display.ts"),
    readSource("src/features/chika/components/ChikaPostComponent.tsx"),
    readSource("src/features/home-feed/adapters/activity-to-home-feed.ts"),
  ]);

  assert.match(displayAdapter, /authorUsername/);
  assert.match(displayAdapter, /cleanUsername/);
  assert.match(displayAdapter, /username: authorUsername/);
  assert.match(displayAdapter, /previewText/);
  assert.match(displayAdapter, /stringValue\(payload, "excerpt"\)/);
  assert.match(displayAdapter, /stringValue\(payload, "body"\)/);
  assert.match(activityAdapter, /excerpt: item\.body/);
  assert.match(component, /displayName=\{post\.author\.displayName\}/);
  assert.match(component, /username=\{post\.author\.username\}/);
  assert.doesNotMatch(component, /Unknown/);
});

test("chika adapters normalize display name, username, and excerpts from real fixture", () => {
  const fixtureOutput = runTsxFixture(`
    import assert from "node:assert/strict";
    import { activityToHomeFeedItem } from "./src/features/home-feed/adapters/activity-to-home-feed.ts";
    import { chikaPostFromHomeFeedItem, chikaPostFromThread } from "./src/features/chika/types/post-display.ts";

    const body = "We’re soft launching Freediving Philippines with rough edges, bugs, and unfinished parts.";
    const activityItem = {
      id: "activity-1",
      type: "chika_thread_created",
      sourceModule: "chika",
      sourceType: "thread",
      sourceId: "thread-1",
      actor: {
        id: "user-1",
        name: "Freediving Philippines",
        username: "freedivingph",
        avatarUrl: null,
      },
      target: { type: "chika_thread", id: "thread-1" },
      visibility: "public",
      occurredAt: "2026-05-20T00:00:00.000Z",
      title: "Welcome to Freediving Philippines",
      body,
      stats: { replies: 4, reactions: 10 },
      metadata: { categoryName: "General" },
      href: "/chika/thread-1",
    };

    const homeItem = activityToHomeFeedItem(activityItem);
    assert.ok(homeItem);
    const homepage = chikaPostFromHomeFeedItem(homeItem);
    assert.equal(homepage.author.displayName, "Freediving Philippines");
    assert.equal(homepage.author.username, "freedivingph");
    assert.equal(homepage.category, "General");
    assert.equal(homepage.title, "Welcome to Freediving Philippines");
    assert.ok(homepage.excerpt?.startsWith("We’re soft launching"));
    assert.equal(homepage.voteScore, 10);
    assert.equal(homepage.replyCount, 4);

    const list = chikaPostFromThread({
      id: "thread-1",
      title: "Welcome to Freediving Philippines",
      content: body,
      voteCount: 10,
      commentCount: 4,
      mode: "normal",
      categoryId: "category-1",
      categorySlug: "general",
      categoryName: "General",
      categoryPseudonymous: false,
      authorDisplayName: "Freediving Philippines",
      authorUsername: "freedivingph",
      isHidden: false,
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
    });
    assert.equal(list.author.displayName, "Freediving Philippines");
    assert.equal(list.author.username, "freedivingph");
    assert.equal(list.category, "General");
    assert.equal(list.title, "Welcome to Freediving Philippines");
    assert.ok(list.excerpt?.startsWith("We’re soft launching"));
    assert.equal(list.voteScore, 10);
    assert.equal(list.replyCount, 4);

    const renderedContract = [
      homepage.author.displayName,
      "@" + homepage.author.username,
      homepage.title,
      homepage.excerpt,
      list.author.displayName,
      "@" + list.author.username,
      list.title,
      list.excerpt,
    ].join(" ");
    assert.match(renderedContract, /Freediving Philippines/);
    assert.match(renderedContract, /@freedivingph/);
    assert.match(renderedContract, /We’re soft launching/);
    assert.doesNotMatch(renderedContract, /Unknown/);

    console.log(JSON.stringify({
      homepage: {
        displayName: homepage.author.displayName,
        username: homepage.author.username,
        category: homepage.category,
        createdAt: homepage.createdAt,
        title: homepage.title,
        excerpt: homepage.excerpt,
        voteScore: homepage.voteScore,
        replyCount: homepage.replyCount,
      },
      chikaList: {
        displayName: list.author.displayName,
        username: list.author.username,
        category: list.category,
        createdAt: list.createdAt,
        title: list.title,
        excerpt: list.excerpt,
        voteScore: list.voteScore,
        replyCount: list.replyCount,
      },
    }));
  `);

  const normalized = JSON.parse(fixtureOutput);
  assert.equal(normalized.homepage.displayName, normalized.chikaList.displayName);
  assert.equal(normalized.homepage.username, normalized.chikaList.username);
  assert.equal(normalized.homepage.excerpt, normalized.chikaList.excerpt);
});

test("media post image reserves space while signed media loads", async () => {
  const component = await readSource(
    "src/features/media/components/MediaPostComponent.tsx",
  );

  assert.match(component, /previewAspectRatio/);
  assert.match(component, /style=\{\{ aspectRatio: previewAspectRatio \}\}/);
  assert.match(component, /animate-pulse bg-muted/);
  assert.match(component, /imageLoaded \? "opacity-100" : "opacity-0"/);
  assert.match(component, /onLoad=\{\(\) => setImageLoaded\(true\)\}/);
});

test("chika loading states are skeletons without loading copy", async () => {
  const [threads, loading] = await Promise.all([
    readSource("src/app/chika/threads.tsx"),
    readSource("src/app/chika/loading.tsx"),
  ]);

  assert.doesNotMatch(threads, /Opening the community board/);
  assert.doesNotMatch(loading, /Opening the community board/);
  assert.match(threads, /ChikaListSkeleton/);
  assert.match(loading, /animate-pulse/);
  assert.match(loading, /Loading Chika posts/);
});

test("shared media and chika cache updaters cover visible cache surfaces", async () => {
  const [mediaCache, chikaCache, mediaActions, chikaVote] = await Promise.all([
    readSource("src/features/media/lib/cache-updaters.ts"),
    readSource("src/features/chika/lib/cache-updaters.ts"),
    readSource("src/features/media/components/MediaPostActions.tsx"),
    readSource("src/features/chika/components/ChikaVoteControl.tsx"),
  ]);

  assert.match(mediaCache, /queryKeys\.media\.profileLists\(\)/);
  assert.match(mediaCache, /queryKeys\.feed\.all/);
  assert.match(mediaCache, /queryKeys\.feed\.activityAll/);
  assert.match(mediaCache, /queryKeys\.explore\.sites\(\)/);
  assert.match(mediaCache, /queryKeys\.media\.postDetail\(postId\)/);
  assert.match(mediaActions, /updateMediaPostInCaches/);

  assert.match(chikaCache, /queryKeys\.chika\.threads\(\)/);
  assert.match(chikaCache, /queryKeys\.feed\.all/);
  assert.match(chikaCache, /queryKeys\.feed\.activityAll/);
  assert.match(chikaVote, /updateChikaThreadInCaches/);
  assert.match(chikaVote, /onMutate/);
  assert.match(chikaVote, /onError/);
});
