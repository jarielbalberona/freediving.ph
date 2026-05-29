import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const packageRoot = path.resolve(globalThis.process.cwd());
const source = await readFile(path.join(packageRoot, "src/index.ts"), "utf8");
const adminSource = await readFile(
  path.join(packageRoot, "src/api/admin.ts"),
  "utf8",
);

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

test("admin group contracts only expose V1 visibility and join policy values", () => {
  assert.match(adminSource, /visibility:\s*"public" \| "private"/);
  assert.match(adminSource, /visibility\?:\s*"public" \| "private"/);
  assert.match(adminSource, /joinPolicy:\s*"open" \| "invite_only"/);
  assert.match(adminSource, /joinPolicy\?:\s*"open" \| "invite_only"/);
  assert.match(adminSource, /type AdminUpdateGroupRequest/);
  assert.doesNotMatch(
    adminSource,
    /visibility:\s*"public" \| "private" \| "invite_only"/,
  );
  assert.doesNotMatch(adminSource, /joinPolicy:\s*"open" \| "approval"/);
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

test("groups contracts include structured location fields used by LocationPicker", () => {
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

test("groups contracts expose normalized logo and cover media fields", () => {
  for (const field of ["logoMediaId", "logoUrl", "coverMediaId", "coverUrl"]) {
    assert.match(source, new RegExp(`${field}\\?:\\s*string \\| null`));
  }
});

test("groups contracts expose shared API response wrappers", () => {
  for (const contract of [
    "GroupPagination",
    "GroupListResponse",
    "GroupDetailResponse",
    "GroupMembersResponse",
    "GroupPostsResponse",
    "GroupMembershipResponse",
    "CreateGroupResponse",
    "CreateGroupPostResponse",
  ]) {
    assert.match(source, new RegExp(`interface ${contract}`));
  }

  assert.match(source, /groups:\s*Group\[\]/);
  assert.match(source, /group:\s*Group/);
  assert.match(source, /members:\s*GroupMember\[\]/);
  assert.match(source, /posts:\s*GroupPost\[\]/);
  assert.match(source, /membership:\s*GroupMember/);
  assert.match(source, /pagination:\s*GroupPagination/);
});
