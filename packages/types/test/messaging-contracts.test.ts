import assert from "node:assert/strict";
import test from "node:test";

import type {
  MessagingRealtimeEnvelope,
  MessagingThreadListResponse,
  MessagingThreadMessage,
  MessagingThreadSummary,
} from "../src/index.ts";

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type _threadListShape = Assert<IsEqual<MessagingThreadListResponse["items"][number], MessagingThreadSummary>>;
type _threadMessageHasBody = Assert<IsEqual<MessagingThreadMessage["body"], string>>;
type _wsVersionLiteral = Assert<IsEqual<MessagingRealtimeEnvelope["v"], 1>>;
type _wsHasEventId = Assert<IsEqual<MessagingRealtimeEnvelope["eventId"], string | undefined>>;

test("messaging contracts are stable", () => {
  assert.equal(true, true);
});
