import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(globalThis.process.cwd());

const runTsxFixture = (code) => {
  const result = spawnSync(
    path.join(appRoot, "../../node_modules/.bin/tsx"),
    ["--eval", code],
    {
      cwd: appRoot,
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
};

test("media post optimistic updater patches list, feed, explore community, and detail caches", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { QueryClient } from "@tanstack/react-query";
    import { queryKeys } from "./src/lib/query/query-keys.ts";
    import {
      buildMediaPostLikePatch,
      buildMediaPostSavePatch,
      updateMediaPostCommentCountDelta,
      updateMediaPostInCaches,
    } from "./src/features/media/lib/cache-updaters.ts";

    const client = new QueryClient();
    client.setQueryData(queryKeys.media.profile("ana"), {
      pages: [{ items: [{ postId: "p1", likeCount: 0, commentCount: 0, viewerHasLiked: false, viewerHasSaved: false }] }],
      pageParams: [undefined],
    });
    client.setQueryData(queryKeys.feed.list({ source: "home" }), {
      items: [{ id: "f1", type: "media_post", entityId: "p1", payload: { likeCount: 0, commentCount: 0, viewerHasLiked: false, viewerHasSaved: false } }],
    });
    client.setQueryData(queryKeys.feed.activityList({ source: "activity" }), {
      items: [{ id: "a1", type: "media_post_created", sourceId: "p1", target: { id: "p1", type: "media_post" }, stats: { likeCount: 0, commentCount: 0, viewerHasLiked: false, viewerHasSaved: false } }],
    });
    client.setQueryData(queryKeys.explore.siteCommunityPosts("apo"), {
      items: [{ id: "c1", type: "media_post_created", sourceId: "p1", target: { id: "p1", type: "media_post" }, stats: { likeCount: 0, commentCount: 0, viewerHasLiked: false, viewerHasSaved: false } }],
    });
    client.setQueryData(queryKeys.media.postDetail("p1"), {
      post: {
        post: { id: "p1", likeCount: 0, commentCount: 0, viewerHasLiked: false, viewerHasSaved: false },
        items: [{ postId: "p1", likeCount: 0, commentCount: 0, viewerHasLiked: false, viewerHasSaved: false }],
      },
    });

    updateMediaPostInCaches(client, "p1", buildMediaPostLikePatch);
    updateMediaPostInCaches(client, "p1", buildMediaPostSavePatch);
    updateMediaPostCommentCountDelta(client, "p1", 1);

    const profileItem = client.getQueryData(queryKeys.media.profile("ana")).pages[0].items[0];
    const homePayload = client.getQueryData(queryKeys.feed.list({ source: "home" })).items[0].payload;
    const activityStats = client.getQueryData(queryKeys.feed.activityList({ source: "activity" })).items[0].stats;
    const communityStats = client.getQueryData(queryKeys.explore.siteCommunityPosts("apo")).items[0].stats;
    const detailPost = client.getQueryData(queryKeys.media.postDetail("p1")).post.post;

    for (const item of [profileItem, homePayload, activityStats, communityStats, detailPost]) {
      assert.equal(item.likeCount, 1);
      assert.equal(item.viewerHasLiked, true);
      assert.equal(item.viewerHasSaved, true);
      assert.equal(item.commentCount, 1);
    }

    updateMediaPostInCaches(client, "p1", buildMediaPostLikePatch);
    assert.equal(client.getQueryData(queryKeys.media.postDetail("p1")).post.post.likeCount, 0);
    assert.equal(client.getQueryData(queryKeys.media.postDetail("p1")).post.post.viewerHasLiked, false);
    console.log("ok");
  `);
  assert.equal(output, "ok");
});

test("chika vote updater covers vote deltas and list/feed/detail caches", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { QueryClient } from "@tanstack/react-query";
    import { queryKeys } from "./src/lib/query/query-keys.ts";
    import {
      buildChikaThreadVotePatch,
      updateChikaThreadInCaches,
    } from "./src/features/chika/lib/cache-updaters.ts";

    const transitions = [
      [{ voteScore: 10, viewerVote: null }, "upvote", 11, "upvote"],
      [{ voteScore: 10, viewerVote: "upvote" }, "upvote", 9, null],
      [{ voteScore: 10, viewerVote: null }, "downvote", 9, "downvote"],
      [{ voteScore: 10, viewerVote: "downvote" }, "downvote", 11, null],
      [{ voteScore: 10, viewerVote: "upvote" }, "downvote", 8, "downvote"],
      [{ voteScore: 10, viewerVote: "downvote" }, "upvote", 12, "upvote"],
    ];
    for (const [current, clicked, voteCount, userReaction] of transitions) {
      assert.deepEqual(buildChikaThreadVotePatch(current, clicked), {
        voteCount,
        userReaction,
      });
    }

    const client = new QueryClient();
    client.setQueryData(queryKeys.chika.threadList(), [{ id: "t1", voteCount: 10, commentCount: 2 }]);
    client.setQueryData(queryKeys.chika.thread("t1"), { id: "t1", voteCount: 10, commentCount: 2 });
    client.setQueryData(queryKeys.feed.list({ source: "home" }), {
      items: [{ id: "f1", type: "community_hot_post", entityId: "t1", payload: { reactionCount: 10, replyCount: 2 } }],
    });
    client.setQueryData(queryKeys.feed.activityList({ source: "activity" }), {
      items: [{ id: "a1", type: "chika_thread_created", sourceId: "t1", target: { id: "t1", type: "chika_thread" }, stats: { reactions: 10, replies: 2 } }],
    });

    updateChikaThreadInCaches(client, "t1", buildChikaThreadVotePatch({ voteScore: 10, viewerVote: null }, "upvote"));

    assert.equal(client.getQueryData(queryKeys.chika.threadList())[0].voteCount, 11);
    assert.equal(client.getQueryData(queryKeys.chika.thread("t1")).userReaction, "upvote");
    assert.equal(client.getQueryData(queryKeys.feed.list({ source: "home" })).items[0].payload.reactionCount, 11);
    assert.equal(client.getQueryData(queryKeys.feed.activityList({ source: "activity" })).items[0].stats.reactions, 11);
    console.log("ok");
  `);
  assert.equal(output, "ok");
});

test("dive-site and feed updater helpers patch targeted caches and support rollback", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { QueryClient } from "@tanstack/react-query";
    import { queryKeys } from "./src/lib/query/query-keys.ts";
    import {
      buildDiveSiteLikePatch,
      buildDiveSiteSavePatch,
      updateDiveSiteInCaches,
    } from "./src/features/explore/lib/cache-updaters.ts";
    import {
      feedActionRemovalIds,
      removeFeedItemsFromCache,
      removeFeedItemsFromCaches,
      restoreQuerySnapshots,
    } from "./src/features/home-feed/lib/cache-updaters.ts";

    const client = new QueryClient();
    client.setQueryData(queryKeys.explore.list({ q: "apo" }), {
      pages: [{ items: [{ id: "s1", slug: "apo", isSaved: false, likeCount: 0, viewerHasLiked: false }] }],
      pageParams: [undefined],
    });
    client.setQueryData(queryKeys.explore.siteDetail("apo"), {
      site: { id: "s1", slug: "apo", isSaved: false, likeCount: 0, viewerHasLiked: false },
      updates: [],
    });
    client.setQueryData(queryKeys.feed.list({ source: "home" }), {
      items: [
        { id: "keep", type: "dive_spot", entityId: "other", payload: { likeCount: 4 } },
        { id: "remove", type: "dive_spot", entityId: "s1", payload: { isSaved: false, likeCount: 0, viewerHasLiked: false } },
      ],
    });

    updateDiveSiteInCaches(client, "s1", buildDiveSiteLikePatch);
    updateDiveSiteInCaches(client, "s1", buildDiveSiteSavePatch);
    assert.equal(client.getQueryData(queryKeys.explore.list({ q: "apo" })).pages[0].items[0].likeCount, 1);
    assert.equal(client.getQueryData(queryKeys.explore.siteDetail("apo")).site.viewerHasLiked, true);
    assert.equal(client.getQueryData(queryKeys.feed.list({ source: "home" })).items[1].payload.isSaved, true);

    const ids = feedActionRemovalIds({ mode: "default", source: "home", items: [{ actionType: "hide", entityId: "remove" }] });
    assert.deepEqual(removeFeedItemsFromCache({ items: [{ id: "a" }, { id: "remove" }] }, ids), { items: [{ id: "a" }] });
    const snapshots = removeFeedItemsFromCaches(client, ids);
    assert.deepEqual(client.getQueryData(queryKeys.feed.list({ source: "home" })).items.map((item) => item.id), ["keep"]);
    restoreQuerySnapshots(client, snapshots.previousHome);
    assert.deepEqual(client.getQueryData(queryKeys.feed.list({ source: "home" })).items.map((item) => item.id), ["keep", "remove"]);
    console.log("ok");
  `);
  assert.equal(output, "ok");
});

test("profile update helper writes my profile, public profile, and session cache", () => {
  const output = runTsxFixture(`
    import assert from "node:assert/strict";
    import { QueryClient } from "@tanstack/react-query";
    import { updateProfileInCaches } from "./src/features/profiles/lib/cache-updaters.ts";
    import { queryKeys } from "./src/lib/query/query-keys.ts";

    const client = new QueryClient();
    const sessionQueryKey = queryKeys.session.current();
    client.setQueryData(sessionQueryKey, { userId: "u1", username: "old", displayName: "Old", permissions: [], scopes: {}, accountStatus: "active", globalRole: "MEMBER", clerkSubject: "clerk" });
    client.setQueryData(queryKeys.profile.me(), { profile: { userId: "u1", username: "old", displayName: "Old" } });
    client.setQueryData(queryKeys.profile.public("new"), { id: "u1", username: "new", displayName: "Old", bio: "", counts: { posts: 0, followers: 0, following: 0 } });

    updateProfileInCaches(client, { profile: { userId: "u1", username: "new", displayName: "New", bio: "Updated", avatarUrl: "https://cdn.example/avatar.jpg" } });

    assert.equal(client.getQueryData(queryKeys.profile.me()).profile.displayName, "New");
    assert.equal(client.getQueryData(sessionQueryKey).username, "new");
    assert.equal(client.getQueryData(sessionQueryKey).displayName, "New");
    const publicProfile = client.getQueryData(queryKeys.profile.public("new"));
    assert.equal(publicProfile.displayName, "New");
    assert.equal(publicProfile.bio, "Updated");
    assert.equal(publicProfile.avatarUrl, "https://cdn.example/avatar.jpg");
    console.log("ok");
  `);
  assert.equal(output, "ok");
});
