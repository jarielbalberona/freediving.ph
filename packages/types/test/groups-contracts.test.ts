import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const packageRoot = path.resolve(globalThis.process.cwd());
const source = await readFile(path.join(packageRoot, "src/index.ts"), "utf8");

test("groups contracts only expose V1 visibility and join policy values", () => {
  assert.match(source, /visibility:\s*"public" \| "private"/);
  assert.match(source, /visibility\?:\s*"public" \| "private"/);
  assert.match(source, /joinPolicy:\s*"open" \| "invite_only"/);
  assert.match(source, /joinPolicy\?:\s*"open" \| "invite_only"/);
  assert.doesNotMatch(
    source,
    /visibility:\s*"public" \| "private" \| "invite_only"/,
  );
  assert.doesNotMatch(source, /joinPolicy:\s*"open" \| "approval"/);
});

test("groups contracts include real invite and viewer membership states", () => {
  assert.match(source, /interface InviteGroupMemberRequest/);
  assert.match(
    source,
    /status:\s*"active" \| "invited" \| "left" \| "declined" \| "blocked"/,
  );
  assert.match(
    source,
    /viewerMembershipStatus\?:\s*\|\s*"active"\s*\|\s*"invited"\s*\|\s*"left"\s*\|\s*"declined"\s*\|\s*"blocked"/,
  );
  assert.match(source, /viewerRole\?:\s*"owner" \| "moderator" \| "member"/);
  assert.match(source, /viewerInviteCreatedAt\?:\s*string/);
});

test("groups contracts include structured location fields used by LocationSearch", () => {
  for (const field of [
    "locationName",
    "formattedAddress",
    "regionCode",
    "provinceCode",
    "cityCode",
    "barangayCode",
    "locationSource",
  ]) {
    assert.match(source, new RegExp(`${field}\\?:`));
  }
});
