import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const journeySource = readFileSync(
  new URL(
    "../src/features/profile/components/ProfileJourney.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("journey renderer tolerates null media ids", () => {
  assert.ok(journeySource.includes("const mediaIds = item.mediaIds ?? [];"));
  assert.ok(journeySource.includes("{mediaIds.length > 0 ? ("));
});
