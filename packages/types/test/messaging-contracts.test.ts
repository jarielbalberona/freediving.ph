import assert from "node:assert/strict";
import test from "node:test";

import type {
  ConversationListItem,
  ConversationListResponse,
  MessageCreatedPayload,
  MessageItem,
  MessageWebSocketEnvelope,
} from "../src/index.ts";

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type _conversationHasMessageItem = Assert<IsEqual<ConversationListItem["lastMessage"], MessageItem>>;
type _listItemsShape = Assert<IsEqual<ConversationListResponse["items"][number], ConversationListItem>>;
type _wsVersionLiteral = Assert<IsEqual<MessageWebSocketEnvelope["v"], 1>>;
type _wsHasEventId = Assert<IsEqual<MessageWebSocketEnvelope["eventId"], string | undefined>>;
type _conversationHasPendingCount = Assert<IsEqual<ConversationListItem["pendingCount"], number>>;
type _messageCreatedHasContent = Assert<IsEqual<MessageCreatedPayload["content"], string>>;

test("messaging contracts are stable", () => {
  assert.equal(true, true);
});
