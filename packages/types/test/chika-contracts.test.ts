import assert from "node:assert/strict";
import test from "node:test";

import type {
  ChikaCategoryResponse,
  ChikaCommentResponse,
  ChikaThreadResponse,
} from "../src/index.ts";

test("chika thread contracts support pseudonymous and moderator fields", () => {
  const thread: ChikaThreadResponse = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    title: "Confession",
    mode: "pseudonymous",
    categoryId: "550e8400-e29b-41d4-a716-446655440090",
    categorySlug: "confessions",
    categoryName: "Confessions",
    categoryPseudonymous: true,
    authorDisplayName: "anon-ABC123",
    realAuthorUserId: "550e8400-e29b-41d4-a716-446655440777",
    isHidden: false,
    createdAt: "2026-02-27T00:00:00Z",
    updatedAt: "2026-02-27T00:00:00Z",
  };
  assert.equal(thread.categoryPseudonymous, true);
});

test("chika comment contract uses string ids", () => {
  const comment: ChikaCommentResponse = {
    id: "123",
    threadId: "550e8400-e29b-41d4-a716-446655440001",
    authorDisplayName: "anon-ABC123",
    content: "hello",
    isHidden: false,
    createdAt: "2026-02-27T00:00:00Z",
    updatedAt: "2026-02-27T00:00:00Z",
  };
  assert.equal(typeof comment.id, "string");
});

test("chika category contract includes pseudonymous flag", () => {
  const category: ChikaCategoryResponse = {
    id: "550e8400-e29b-41d4-a716-446655440090",
    slug: "confessions",
    name: "Confessions",
    pseudonymous: true,
  };
  assert.equal(category.pseudonymous, true);
});

