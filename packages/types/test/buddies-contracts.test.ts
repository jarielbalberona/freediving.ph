import assert from "node:assert/strict";
import test from "node:test";

import type { BuddyRequestListResponse, BuddyUserCard, PaginatedApiEnvelope } from "../src/index.ts";

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type IncomingItem = BuddyRequestListResponse["incoming"][number];
type OutgoingItem = BuddyRequestListResponse["outgoing"][number];

type _incomingFromUserMatches = Assert<IsEqual<IncomingItem["fromUser"], BuddyUserCard | null>>;
type _outgoingToUserMatches = Assert<IsEqual<OutgoingItem["toUser"], BuddyUserCard | null>>;
type _requestsArePaginatable = Assert<IsEqual<PaginatedApiEnvelope<BuddyRequestListResponse>["data"], BuddyRequestListResponse>>;

test("buddy contracts are compatible with paginated envelopes", () => {
  assert.equal(true, true);
});
