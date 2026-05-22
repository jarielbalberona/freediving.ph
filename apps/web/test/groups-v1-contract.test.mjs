import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(globalThis.process.cwd());
const repoRoot = path.resolve(appRoot, "../..");

const readApp = (relativePath) =>
  readFile(path.join(appRoot, relativePath), "utf8");
const readRepo = (relativePath) =>
  readFile(path.join(repoRoot, relativePath), "utf8");

test("groups API serializes mine=true and exposes real invite endpoints", async () => {
  const apiSource = await readApp("src/features/groups/api/groups.ts");
  const hooksSource = await readApp("src/features/groups/hooks/mutations.ts");
  const queriesSource = await readApp("src/features/groups/hooks/queries.ts");

  assert.match(apiSource, /params\.append\(['"]mine['"], ['"]true['"]\)/);
  assert.match(
    queriesSource,
    /groupsApi\.getGroups\(\{\s*mine:\s*true,\s*page,\s*limit\s*\}\)/,
  );
  assert.match(queriesSource, /viewerScope/);
  assert.match(apiSource, /\/v1\/groups\/\$\{data\.groupId\}\/invites/);
  assert.match(apiSource, /\/v1\/groups\/\$\{groupId\}\/invites\/accept/);
  assert.match(apiSource, /\/v1\/groups\/\$\{groupId\}\/invites\/reject/);
  assert.match(hooksSource, /useInviteGroupMember/);
  assert.match(hooksSource, /useAcceptGroupInvite/);
  assert.match(hooksSource, /useRejectGroupInvite/);
});

test("groups list/create UI uses V1 visibility, join policy, and structured location", async () => {
  const pageSource = await readApp("src/app/groups/page.tsx");

  assert.match(
    pageSource,
    /type VisibilityFilter = "all" \| "public" \| "private"/,
  );
  assert.match(pageSource, /LocationSearch/);
  assert.match(pageSource, /EMPTY_LOCATION_SEARCH_VALUE/);
  assert.match(pageSource, /viewerScope/);
  assert.doesNotMatch(pageSource, /session\.hasRole\("super_admin"\)/);
  assert.match(pageSource, /buildDisplayLocation\(createLocation\)/);
  assert.match(pageSource, /locationName:\s*createLocation\.locationName/);
  assert.match(pageSource, /cityCode:\s*createLocation\.cityCode/);
  assert.match(pageSource, /locationSource:\s*createLocation\.locationSource/);
  assert.match(pageSource, /Private groups are invite-only\./);
  assert.match(pageSource, /setCreateJoinPolicy\("invite_only"\)/);
  assert.match(
    pageSource,
    /joinPolicy:\s*isPrivateCreate \? "invite_only" : createJoinPolicy/,
  );
  assert.match(pageSource, /isPrivateCreate \? null : \(/);
  assert.match(pageSource, /<SelectItem value="private">Private<\/SelectItem>/);
  assert.match(
    pageSource,
    /<SelectItem value="invite_only">Invite only<\/SelectItem>/,
  );
  assert.doesNotMatch(pageSource, /"public" \| "private" \| "invite_only"/);
  assert.doesNotMatch(pageSource, /Approval|approval|isApprovalOnly/);
  assert.doesNotMatch(
    pageSource,
    /VisibilityFilter = "all" \| "public" \| "invite_only"/,
  );
  assert.doesNotMatch(pageSource, /Invite-only groups/);
});

test("groups detail UI renders invite lifecycle instead of fake self-join", async () => {
  const detailSource = await readApp("src/app/groups/[id]/page.tsx");

  assert.match(detailSource, /useInviteGroupMember/);
  assert.match(detailSource, /useAcceptGroupInvite/);
  assert.match(detailSource, /useRejectGroupInvite/);
  assert.match(detailSource, /useUserSearch/);
  assert.match(detailSource, /getApiErrorStatus/);
  assert.match(detailSource, /Access not allowed/);
  assert.match(detailSource, /This is a private group\./);
  assert.doesNotMatch(detailSource, /session\.hasRole\("super_admin"\)/);
  assert.match(
    detailSource,
    /useGroupMembers\(\s*groupId,\s*1,\s*20,\s*canLoadGroupResources,\s*viewerScope,\s*\)/,
  );
  assert.match(
    detailSource,
    /useGroupPosts\(\s*groupId,\s*1,\s*20,\s*canLoadGroupResources,\s*viewerScope,\s*\)/,
  );
  assert.match(detailSource, /Accept invite/);
  assert.match(detailSource, /Reject/);
  assert.match(detailSource, /Invite member/);
  assert.match(detailSource, /hasPendingInvite/);
  assert.match(
    detailSource,
    /canJoin = group\.visibility === "public" && group\.joinPolicy === "open"/,
  );
  assert.doesNotMatch(detailSource, /Approval|approval|isApprovalOnly/);
  assert.doesNotMatch(detailSource, /group\.visibility !== "invite_only"/);
  assert.doesNotMatch(detailSource, /groups\.manage/);
});

test("super admin group management is isolated to admin pages", async () => {
  const adminPageSource = await readApp("src/app/admin/groups/page.tsx");
  const adminApiSource = await readApp("src/features/admin/api/admin.ts");
  const routesSource = await readApp("src/lib/api/fphgo-routes.ts");

  assert.match(adminPageSource, /useAdminUpdateGroup/);
  assert.match(adminPageSource, /useAdminArchiveGroup/);
  assert.match(adminApiSource, /routes\.v1\.admin\.group\(groupId\)/);
  assert.match(adminApiSource, /routes\.v1\.admin\.archiveGroup\(groupId\)/);
  assert.match(routesSource, /\/v1\/admin\/groups\/\$\{toPathId\(groupId\)\}/);
  assert.doesNotMatch(adminPageSource, /\/v1\/groups\/\$\{groupId\}\/archive/);
});

test("shared groups contracts expose only V1 values", async () => {
  const typesSource = await readRepo("packages/types/src/index.ts");

  assert.match(typesSource, /visibility:\s*"public" \| "private"/);
  assert.match(typesSource, /joinPolicy:\s*"open" \| "invite_only"/);
  assert.match(
    typesSource,
    /viewerMembershipStatus\?:\s*\|\s*"active"\s*\|\s*"invited"\s*\|\s*"left"\s*\|\s*"declined"\s*\|\s*"blocked"/,
  );
  assert.match(typesSource, /interface InviteGroupMemberRequest/);
  assert.doesNotMatch(
    typesSource,
    /visibility:\s*"public" \| "private" \| "invite_only"/,
  );
  assert.doesNotMatch(typesSource, /joinPolicy:\s*"open" \| "approval"/);
});
