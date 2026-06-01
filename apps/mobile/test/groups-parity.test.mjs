import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("mobile groups list supports discovery filters and create group flow", () => {
  const api = read("src/features/groups/api/groups-api.ts");
  const queries = read("src/features/groups/hooks/use-groups-query.ts");
  const mutations = read("src/features/groups/hooks/use-group-mutations.ts");
  const screen = read("src/features/groups/screens/groups-screen.tsx");
  const keys = read("src/lib/query/query-keys.ts");

  assert.match(api, /createGroup/);
  assert.match(api, /body: payload/);
  assert.match(queries, /useGroupsQuery = \(filters: GroupFilters = \{\}\)/);
  assert.match(queries, /search: filters\.search/);
  assert.match(queries, /visibility: filters\.visibility/);
  assert.match(mutations, /useCreateGroupMutation/);
  assert.match(mutations, /requireCreateGroupPayload/);
  assert.match(screen, /Search by group name or location/);
  assert.match(screen, /My groups/);
  assert.match(screen, /Create group/);
  assert.match(screen, /visibility === "private" \? "invite_only"/);
  assert.match(keys, /search\?: string/);
  assert.match(keys, /visibility\?: string/);
});

test("mobile groups keep membership and role actions backend-driven", () => {
  const detail = read("src/features/groups/screens/group-detail-screen.tsx");
  const mutations = read("src/features/groups/hooks/use-group-mutations.ts");
  const resolver = read("src/features/shared/links/lib/resolve-fph-link.ts");

  assert.match(detail, /viewerMembershipStatus/);
  assert.match(detail, /viewerRole !== "owner"/);
  assert.match(detail, /Accept invite/);
  assert.match(detail, /Decline/);
  assert.match(detail, /Post to group/);
  assert.match(mutations, /joinGroup\(requireGroupId\(groupId\)/);
  assert.match(mutations, /acceptGroupInvite\(requireGroupId\(groupId\)/);
  assert.match(mutations, /rejectGroupInvite\(requireGroupId\(groupId\)/);
  assert.doesNotMatch(detail, /archive|delete|removeMember/i);
  assert.match(resolver, /parts\[0\] === "groups"/);
});
