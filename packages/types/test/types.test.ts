import assert from "node:assert/strict";
import test from "node:test";

import type { ThreadWithUserDto } from "../src/index.ts";

test("thread contract shape stays consistent", () => {
  const dto: ThreadWithUserDto = {
    thread: {
      id: 1,
      userId: 2,
      title: "Session update",
      content: "Weekend dive plan",
      createdAt: "2026-02-16T00:00:00.000Z",
      updatedAt: "2026-02-16T00:00:00.000Z",
    },
    user: {
      id: 2,
      username: "freediver",
      alias: "Blue Whale",
      email: null,
    },
    commentCount: 0,
    upvotes: 0,
    downvotes: 0,
  };

  assert.equal(dto.thread.title.length > 0, true);
  assert.equal(dto.user.username.length > 0, true);
});
