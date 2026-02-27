import assert from "node:assert/strict";
import test from "node:test";

import { canonicalString, normalizeCacheKey, signCanonical, validateSignature } from "./worker.mjs";

test("tampered params fail signature", async () => {
  const url = new URL("https://cdn.freediving.ph/i/chika/thread/abc.jpg?w=640&q=75&f=auto&exp=2000000000&k=1");
  const sig = await signCanonical(canonicalString(url.pathname, url.searchParams), "secret");
  url.searchParams.set("sig", sig);
  url.searchParams.set("w", "641");

  const result = await validateSignature(url, { MEDIA_SIGNING_SECRET_1: "secret" }, 1700000000);
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test("expired url fails", async () => {
  const url = new URL("https://cdn.freediving.ph/i/chika/thread/abc.jpg?w=640&q=75&f=auto&exp=1699999000&k=1");
  const sig = await signCanonical(canonicalString(url.pathname, url.searchParams), "secret");
  url.searchParams.set("sig", sig);

  const result = await validateSignature(url, { MEDIA_SIGNING_SECRET_1: "secret" }, 1700000000);
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test("cache key ignores sig and exp", () => {
  const a = normalizeCacheKey(
    "https://cdn.freediving.ph/i/feed/u/1.jpg?w=640&q=75&f=auto&exp=1700000100&k=1&sig=abc",
  );
  const b = normalizeCacheKey(
    "https://cdn.freediving.ph/i/feed/u/1.jpg?w=640&q=75&f=auto&exp=1700000200&k=1&sig=def",
  );
  assert.equal(a, b);
});
