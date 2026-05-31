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

test("management entity image settings support upload, replace, and null removal", async () => {
  const source = await readApp(
    "src/features/media/components/EntityLogoCoverSettings.tsx",
  );

  assert.match(source, /label="Logo"|>Logo</);
  assert.match(source, /label="Cover photo"|>Cover photo</);
  assert.match(source, /Used in cards, switchers, and compact headers\./);
  assert.match(
    source,
    /Used as the wide header image on public and management pages\./,
  );
  assert.match(source, /useUploadMedia/);
  assert.match(source, /logoMediaId: upload\.id/);
  assert.match(source, /coverMediaId: upload\.id/);
  assert.match(source, /logoMediaId: null/);
  assert.match(source, /coverMediaId: null/);
  assert.doesNotMatch(source, /deleteMedia|deleteBlob|removeBlob/);
});

test("event, school, and group management shells wire correct media contexts", async () => {
  const [eventShell, schoolShell, groupShell] = await Promise.all([
    readApp("src/features/events/components/event-management-shell.tsx"),
    readApp("src/features/schools/components/school-management-shell.tsx"),
    readApp("src/features/groups/components/group-management-shell.tsx"),
  ]);

  assert.match(eventShell, /logoContext="event_logo"/);
  assert.match(eventShell, /coverContext="event_cover"/);
  assert.match(eventShell, /coverUrl=\{event\.coverUrl \?\? event\.coverPhotoUrl\}/);
  assert.match(eventShell, /useUpdateEvent/);

  assert.match(schoolShell, /logoContext="school_logo"/);
  assert.match(schoolShell, /coverContext="school_cover"/);
  assert.match(schoolShell, /useUpdateSchool/);

  assert.match(groupShell, /logoContext="group_logo"/);
  assert.match(groupShell, /coverContext="group_cover"/);
  assert.match(groupShell, /useUpdateGroup/);
});
