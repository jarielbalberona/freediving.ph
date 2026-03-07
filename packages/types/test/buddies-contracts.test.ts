import assert from "node:assert/strict";
import test from "node:test";

import type {
  BuddyListResponse,
  BuddyPreviewResponse,
  BuddyProfile,
  IncomingBuddyRequestsResponse,
  OutgoingBuddyRequestsResponse,
} from "../src/index.ts";

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type IncomingItem = IncomingBuddyRequestsResponse["items"][number];
type OutgoingItem = OutgoingBuddyRequestsResponse["items"][number];
type BuddyItem = BuddyListResponse["items"][number];
type PreviewItem = BuddyPreviewResponse["items"][number];

type _incomingRequesterMatches = Assert<IsEqual<IncomingItem["requester"], BuddyProfile>>;
type _outgoingTargetMatches = Assert<IsEqual<OutgoingItem["target"], BuddyProfile>>;
type _buddyListShape = Assert<IsEqual<BuddyItem, BuddyProfile>>;
type _previewItemShape = Assert<IsEqual<PreviewItem, BuddyProfile>>;
type _previewHasCount = Assert<IsEqual<BuddyPreviewResponse["count"], number>>;

test("buddy contracts align with v1 responses", () => {
  assert.equal(true, true);
});
