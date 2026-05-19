import assert from "node:assert/strict";
import test from "node:test";

import type {
  ActivityFeedFilter,
  ActivityFeedItem,
  ActivityFeedResponse,
  FeedActionsRequest,
  FeedSource,
  FeedImpressionsRequest,
  HomeFeedItem,
  HomeFeedMode,
  HomeFeedResponse,
} from "../src/index.ts";

type Assert<T extends true> = T;
type IsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B
  ? 1
  : 2
  ? true
  : false;

type _mode = Assert<
  IsEqual<
    HomeFeedMode,
    "latest" | "nearby" | "chika" | "dive-reports" | "events"
  >
>;
type _feedSource = Assert<IsEqual<FeedSource, "home" | "activity">>;
type _activityFilter = Assert<
  IsEqual<
    ActivityFeedFilter,
    "latest" | "nearby" | "chika" | "dive-reports" | "events"
  >
>;
type _activityItems = Assert<
  IsEqual<ActivityFeedResponse["items"][number], ActivityFeedItem>
>;
type _items = Assert<IsEqual<HomeFeedResponse["items"][number], HomeFeedItem>>;
type _impressions = Assert<
  IsEqual<FeedImpressionsRequest["items"][number]["feedItemId"], string>
>;
type _actions = Assert<
  IsEqual<FeedActionsRequest["items"][number]["entityType"], string>
>;

test("feed contracts expose home response and telemetry payloads", () => {
  assert.equal(true, true);
});

test("feed item contracts expose presentation metadata", () => {
  const item = {
    id: "fi_post_1",
    feedSource: "home",
    type: "post",
    entityId: "post_1",
    telemetryEntityType: "post",
    telemetryEntityId: "post_1",
    score: 0.91,
    reasons: ["latest", "fresh"],
    typeLabel: "Dive update",
    typeHint: "Social post from the community",
    rankLabel: "Latest",
    rankHint: "Recent eligible community activity.",
    tone: "social",
    detailHref: "/anilao-local",
    authorHref: "/anilao-local",
    createdAt: "2026-03-09T00:00:00Z",
    payload: {},
  } satisfies HomeFeedItem;

  assert.equal(item.typeLabel, "Dive update");
  assert.equal(item.rankLabel, "Latest");
  assert.equal(item.detailHref, "/anilao-local");
});

test("activity feed contracts expose ledger response shape", () => {
  const item = {
    id: "activity_1",
    type: "chika_thread_created",
    sourceModule: "chika",
    sourceType: "thread",
    sourceId: "thread_1",
    actor: {
      id: "",
      name: "anon-abc123",
      username: "",
    },
    target: {
      type: "chika_thread",
      id: "thread_1",
    },
    visibility: "public",
    occurredAt: "2026-05-19T00:00:00Z",
    media: [
      {
        mediaObjectId: "media_1",
        width: 1200,
        height: 800,
        displayUrl: "https://cdn.example.com/photo.jpg?sig=abc",
      },
    ],
    href: "/chika/thread_1",
  } satisfies ActivityFeedItem;
  const response = {
    items: [item],
    nextCursor: "opaque",
  } satisfies ActivityFeedResponse;

  assert.equal(response.items[0].type, "chika_thread_created");
  assert.equal(response.items[0].media?.[0]?.displayUrl?.includes("sig="), true);
});

test("feed telemetry contracts carry source without breaking legacy mode", () => {
  const impressions = {
    sessionId: "session-1",
    source: "activity",
    mode: "latest",
    items: [
      {
        feedItemId: "activity-1",
        entityType: "activity_item",
        entityId: "activity-1",
        position: 0,
      },
    ],
  } satisfies FeedImpressionsRequest;
  const actions = {
    sessionId: "session-1",
    source: "activity",
    mode: "latest",
    items: [
      {
        feedItemId: "activity-1",
        entityType: "activity_item",
        entityId: "activity-1",
        actionType: "hide_item",
      },
    ],
  } satisfies FeedActionsRequest;

  assert.equal(impressions.source, "activity");
  assert.equal(actions.items[0].entityType, "activity_item");
});
