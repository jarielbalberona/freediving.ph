import assert from "node:assert/strict";
import test from "node:test";

import { noop } from "../src/index.ts";

test("noop is callable and returns undefined", () => {
  assert.equal(typeof noop, "function");
  assert.equal(noop(), undefined);
});
