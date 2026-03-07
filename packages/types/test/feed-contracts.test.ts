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
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type _mode = Assert<IsEqual<HomeFeedMode, "following" | "nearby" | "training" | "spot-reports">>;
type _items = Assert<IsEqual<HomeFeedResponse["items"][number], HomeFeedItem>>;
type _impressions = Assert<IsEqual<FeedImpressionsRequest["items"][number]["feedItemId"], string>>;
type _actions = Assert<IsEqual<FeedActionsRequest["items"][number]["entityType"], string>>;

test("feed contracts expose home response and telemetry payloads", () => {
  assert.equal(true, true);
});
