import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_NAME,
  DEFAULT_CURRENCY,
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
} from "../src/index.ts";

test("config exposes app name", () => {
  assert.equal(APP_NAME, "freediving.ph");
});

test("config exposes Philippine market defaults", () => {
  assert.equal(DEFAULT_CURRENCY, "PHP");
  assert.equal(DEFAULT_CURRENCY_SYMBOL, "₱");
  assert.equal(DEFAULT_LOCALE, "en-PH");
  assert.equal(DEFAULT_TIMEZONE, "Asia/Manila");
});
