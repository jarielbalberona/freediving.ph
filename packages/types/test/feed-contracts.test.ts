import assert from "node:assert/strict";
import test from "node:test";

import type {
  FeedActionsRequest,
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
  IsEqual<HomeFeedMode, "following" | "nearby" | "training" | "spot-reports">
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
    type: "post",
    entityId: "post_1",
    score: 0.91,
    reasons: ["following", "fresh"],
    typeLabel: "Dive update",
    typeHint: "Social post from the community",
    rankLabel: "From your network",
    rankHint: "Fresh activity from people you follow",
    tone: "social",
    detailHref: "/anilao-local",
    authorHref: "/anilao-local",
    createdAt: "2026-03-09T00:00:00Z",
    payload: {},
  } satisfies HomeFeedItem;

  assert.equal(item.typeLabel, "Dive update");
  assert.equal(item.rankLabel, "From your network");
  assert.equal(item.detailHref, "/anilao-local");
});
