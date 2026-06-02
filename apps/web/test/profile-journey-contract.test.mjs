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

test("journey renderer uses compact timeline rows and dialog-based manual note editing", () => {
  assert.ok(journeySource.includes("Manual note"));
  assert.ok(journeySource.includes("item.visibilityLabel ??"));
  assert.ok(journeySource.includes("Add journey note"));
  assert.ok(journeySource.includes("<Dialog"));
  assert.ok(journeySource.includes("Edit journey note"));
  assert.ok(journeySource.includes('visibility: "public"'));
  assert.ok(!journeySource.includes("Generated milestone"));
  assert.ok(!journeySource.includes("proof-backed post"));
  assert.ok(
    !journeySource.includes(
      "Write the milestone headline, then add the story, date, and audience",
    ),
  );
  assert.ok(!journeySource.includes("SelectTrigger"));
  assert.ok(
    journeySource.includes(
      'placeholder="Add context that belongs in your Journey',
    ),
  );
  assert.ok(journeySource.includes('aria-label="Delete journey entry"'));
});
