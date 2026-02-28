import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web"))
  ? cwd
  : path.join(cwd, "apps", "web");

const submitPagePath = path.join(appRoot, "src/app/explore/submit/page.tsx");
const dialogPath = path.join(
  appRoot,
  "src/app/explore/submit/map-pin-picker-dialog.tsx",
);
const schemaPath = path.join(
  appRoot,
  "src/features/diveSpots/schemas/siteSubmission.schema.ts",
);

test("explore submit flow stores map-picked location and does not expose manual area or coordinate inputs", async () => {
  const [pageSource, dialogSource, schemaSource] = await Promise.all([
    readFile(submitPagePath, "utf8"),
    readFile(dialogPath, "utf8"),
    readFile(schemaPath, "utf8"),
  ]);

  assert.match(schemaSource, /location:\s*locationSchema\.nullable\(\)/);
  assert.match(schemaSource, /description:\s*z/);
  assert.match(schemaSource, /Pick the dive spot on the map before submitting/);

  assert.match(pageSource, /Dive spot location/);
  assert.match(pageSource, /Description/);
  assert.match(pageSource, /Mark on map/);
  assert.match(pageSource, /aria-label="Edit pin"/);
  assert.match(pageSource, /description:\s*values\.description\.trim\(\)/);
  assert.match(pageSource, /lat:\s*values\.location\.lat/);
  assert.match(pageSource, /lng:\s*values\.location\.lng/);
  assert.doesNotMatch(pageSource, /name="area"/);
  assert.doesNotMatch(pageSource, /name="latitude"/);
  assert.doesNotMatch(pageSource, /name="longitude"/);
  assert.doesNotMatch(pageSource, /name="contactInfo"/);

  assert.match(dialogSource, /Pin the dive site/);
  assert.match(dialogSource, /Confirm pin/);
  assert.match(dialogSource, /draggable/);
  assert.match(dialogSource, /onClick=\{\(event\) =>/);
  assert.match(
    dialogSource,
    /className="h-dvh max-h-none max-w-none rounded-none border-0 p-0 sm:h-dvh"/,
  );
});
