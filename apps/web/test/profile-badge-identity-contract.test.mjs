import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const profileHeaderSource = readFileSync(
  new URL(
    "../src/features/profile/components/ProfileHeader.tsx",
    import.meta.url,
  ),
  "utf8",
);

const profilePageSource = readFileSync(
  new URL("../src/features/profile/pages/ProfilePage.tsx", import.meta.url),
  "utf8",
);

const badgeIdentityRowSource = readFileSync(
  new URL(
    "../src/features/profile/components/ProfileBadgeIdentityRow.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("profile page passes badge category summaries into the profile header", () => {
  assert.ok(
    profilePageSource.includes(
      "badgeCategorySummaries={badgesQuery.data?.categorySummaries ?? []}",
    ),
  );
  assert.ok(
    profileHeaderSource.includes(
      "badgeCategorySummaries?: BadgeCategorySummary[]",
    ),
  );
  assert.ok(
    profileHeaderSource.includes(
      "<ProfileBadgeIdentityRow items={badgeCategorySummaries} />",
    ),
  );
});

test("profile badge identity row is logo driven and does not hardcode the CDN host", () => {
  assert.ok(badgeIdentityRowSource.includes("next/image"));
  assert.ok(badgeIdentityRowSource.includes("DialogContent"));
  assert.ok(badgeIdentityRowSource.includes("cursor-zoom-in"));
  assert.ok(
    badgeIdentityRowSource.includes('aria-label="Badge category identities"'),
  );
  assert.ok(!badgeIdentityRowSource.includes("https://cdn.freediving.ph"));
});
