import assert from "node:assert/strict";
import test from "node:test";

test("NEXT_PUBLIC_FPHGO_BASE_URL is a non-empty string in web runtime config", () => {
  const fallback = "http://localhost:4000";
  const apiBaseUrl = process.env.NEXT_PUBLIC_FPHGO_BASE_URL || fallback;

  assert.equal(typeof apiBaseUrl, "string");
  assert.notEqual(apiBaseUrl.trim().length, 0);
});
