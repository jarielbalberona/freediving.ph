import assert from "node:assert/strict";
import test from "node:test";

import { APP_NAME } from "../src/index.ts";

test("config exposes app name", () => {
  assert.equal(APP_NAME, "freediving.ph");
});
