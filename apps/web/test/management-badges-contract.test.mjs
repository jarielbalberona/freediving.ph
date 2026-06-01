import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const badgePageSource = readFileSync(
  new URL(
    "../src/features/profile/pages/BadgeManagementPage.tsx",
    import.meta.url,
  ),
  "utf8",
);

const managementSidebarSource = readFileSync(
  new URL("../src/components/layout/management-sidebar.tsx", import.meta.url),
  "utf8",
);

const badgeSeedMigrationSource = readFileSync(
  new URL(
    "../../../services/fphgo/db/migrations/0089_badges_categories_corrected.sql",
    import.meta.url,
  ),
  "utf8",
);

const badgeCertificationMigrationSource = readFileSync(
  new URL(
    "../../../services/fphgo/db/migrations/0090_badge_certification_templates.sql",
    import.meta.url,
  ),
  "utf8",
);

test("management sidebar includes badge credentials nav item", () => {
  assert.ok(
    managementSidebarSource.includes('label: "My Badges & Credentials"'),
  );
  assert.ok(managementSidebarSource.includes('href: "/management/badges"'));
});

test("badge management page uses a dialog trigger and no card shells", () => {
  assert.ok(badgePageSource.includes("Add Badge & Credentials"));
  assert.ok(badgePageSource.includes("Back to profile"));
  assert.ok(badgePageSource.includes("<Dialog open={dialogOpen}"));
  assert.ok(badgePageSource.includes("filter((item) => !item.isSystem)"));
  assert.ok(!badgePageSource.includes("<Card>"));
  assert.ok(!badgePageSource.includes("CardHeader"));
  assert.ok(!badgePageSource.includes("CardContent"));
});

test("badge category labels and corrective seed mapping match the current split", () => {
  assert.ok(badgePageSource.includes('experience: "Experience"'));
  assert.ok(badgePageSource.includes('community_role: "Community Roles"'));
  assert.ok(
    badgeSeedMigrationSource.includes(
      "SET category = 'experience'\nWHERE slug IN (\n  'dive-guide',\n  'underwater-photographer',\n  'marine-conservation-volunteer',\n  'spearfisher',\n  'boat-captain',\n  'rescue-team-member',\n  'underwater-videographer'",
    ),
  );
  assert.ok(
    badgeSeedMigrationSource.includes(
      "SET category = 'community_role'\nWHERE slug IN ('safety-diver', 'competition-athlete', 'instructor', 'coach')",
    ),
  );
  assert.ok(
    badgeSeedMigrationSource.includes(
      "SET category = 'auto_stat',\n    is_system = TRUE\nWHERE slug = 'dive-sites-visited'",
    ),
  );
});

test("badge certification templates match the current public certification set", () => {
  const activeCertificationSlugs = [
    "molchanovs-wave-1",
    "molchanovs-wave-2",
    "molchanovs-wave-3",
    "molchanovs-wave-4",
    "molchanovs-wave-2i",
    "molchanovs-wave-3i",
    "molchanovs-wave-4i",
    "molchanovs-wave-3it",
    "molchanovs-wave-4it",
    "aida-1",
    "aida-2",
    "aida-3",
    "aida-4",
    "aida-monofin-freediver",
    "aida-f-emerg-med-responder",
    "aida-competition-freediver",
    "aida-instructor",
    "aida-master-instructor",
    "aida-instructor-trainer",
    "aida-instructor-judge",
    "aida-instructor-youth",
    "ssi-freediver",
    "ssi-advanced-freediver",
    "ssi-performance-freediver",
    "ssi-instructor",
    "ssi-performance-instructor",
    "ssi-instructor-trainer",
    "padi-freediver",
    "padi-advanced-freediver",
    "padi-master-freediver",
    "padi-instructor",
    "padi-advanced-instructor",
    "padi-master-instructor",
  ];

  for (const slug of activeCertificationSlugs) {
    assert.match(badgeCertificationMigrationSource, new RegExp(`'${slug}'`));
  }

  assert.match(
    badgeCertificationMigrationSource,
    /category = 'certification'[\s\S]*AND slug NOT IN/,
  );
  assert.match(badgeCertificationMigrationSource, /is_public = FALSE/);
  assert.match(badgeCertificationMigrationSource, /'molchanovs-lap-1'/);
  assert.match(badgeCertificationMigrationSource, /'molchanovs-lap-2'/);
  assert.match(badgeCertificationMigrationSource, /'molchanovs-instructor'/);
});
