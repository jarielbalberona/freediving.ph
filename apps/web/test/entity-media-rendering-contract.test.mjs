import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web"))
  ? cwd
  : path.join(cwd, "apps", "web");

const readApp = (relativePath) =>
  readFile(path.join(appRoot, relativePath), "utf8");

test("shared entity media renderer uses real URLs and local fallbacks", async () => {
  const source = await readApp("src/components/common/entity-media.tsx");

  assert.match(source, /src=\{src\}/);
  assert.match(source, /alt=\{`\$\{label\} logo`\}/);
  assert.match(source, /alt=\{`\$\{label\} cover photo`\}/);
  assert.match(source, /entityInitials/);
  assert.doesNotMatch(source, /placehold|placeholder\.com|picsum|unsplash/i);
});

test("event public rendering prefers normalized media with legacy cover fallback", async () => {
  const [card, detail] = await Promise.all([
    readApp("src/features/events/components/EventCard.tsx"),
    readApp("src/app/events/[slug]/client-page.tsx"),
  ]);

  assert.match(card, /event\.coverUrl \?\? event\.coverPhotoUrl \?\? null/);
  assert.match(card, /src=\{event\.logoUrl\}/);
  assert.match(detail, /event\.coverUrl \?\? event\.coverPhotoUrl/);
  assert.match(detail, /src=\{event\.logoUrl\}/);
});

test("school and group public pages render logo and cover fields", async () => {
  const [schools, groups, groupDetail] = await Promise.all([
    readApp("src/features/schools/pages/PublicSchoolsPage.tsx"),
    readApp("src/app/groups/client-page.tsx"),
    readApp("src/app/groups/[slug]/client-page.tsx"),
  ]);

  assert.match(schools, /src=\{school\.logoUrl\}/);
  assert.match(schools, /src=\{school\.coverUrl\}/);
  assert.match(groups, /src=\{group\.logoUrl\}/);
  assert.match(groups, /src=\{group\.coverUrl\}/);
  assert.match(groupDetail, /src=\{group\.logoUrl\}/);
  assert.match(groupDetail, /src=\{group\.coverUrl\}/);
});

test("management cards and switchers receive identity images", async () => {
  const [card, events, schools, groups, manageSchools, manageGroups] =
    await Promise.all([
      readApp("src/components/layout/management-entity-card.tsx"),
      readApp("src/features/events/components/event-management-shell.tsx"),
      readApp("src/features/schools/components/school-management-shell.tsx"),
      readApp("src/features/groups/components/group-management-shell.tsx"),
      readApp("src/features/schools/pages/ManageSchoolsPage.tsx"),
      readApp("src/app/management/groups/page.tsx"),
    ]);

  assert.match(card, /src=\{coverImage\}/);
  assert.match(card, /src=\{avatarUrl\}/);
  assert.match(events, /src=\{event\.logoUrl\}/);
  assert.match(events, /src=\{item\.logoUrl\}/);
  assert.match(schools, /src=\{school\.logoUrl\}/);
  assert.match(schools, /src=\{item\.logoUrl\}/);
  assert.match(groups, /src=\{group\.logoUrl\}/);
  assert.match(groups, /src=\{item\.logoUrl\}/);
  assert.match(manageSchools, /coverImage=\{school\.coverUrl \?\? null\}/);
  assert.match(manageSchools, /avatarUrl=\{school\.logoUrl \?\? null\}/);
  assert.match(manageGroups, /coverImage=\{group\.coverUrl \?\? null\}/);
  assert.match(manageGroups, /avatarUrl=\{group\.logoUrl \?\? null\}/);
});
