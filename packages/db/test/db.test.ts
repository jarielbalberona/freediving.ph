import assert from "node:assert/strict";
import test from "node:test";

test("db package entry loads", async () => {
  const module = await import("../src/index.ts");

  assert.deepEqual(Object.keys(module), []);
});
