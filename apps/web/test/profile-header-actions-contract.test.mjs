import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web"))
  ? cwd
  : path.join(cwd, "apps", "web");

const pagePath = path.join(appRoot, "src/features/profile/pages/ProfilePage.tsx");
const headerPath = path.join(
  appRoot,
  "src/features/profile/components/ProfileHeader.tsx",
);

test("profile ownership uses backend flags plus signed-in user id fallback", async () => {
  const page = await readFile(pagePath, "utf8");

  assert.match(page, /session\.status === "signed_in" \? session\.me : null/);
  assert.match(page, /signedInUser\?\.userId/);
  assert.match(page, /signedInUser\.userId === profileQuery\.data\.id/);
  assert.match(page, /normalizeUsername\(signedInUser\.username\)/);
  assert.match(page, /viewerRelationship\?\.isSelf/);
  assert.match(page, /viewerRelationship\?\.canEdit/);
  assert.match(page, /showVisitorActions = !isOwner && session\.status !== "loading"/);
  assert.match(page, /showVisitorActions=\{showVisitorActions\}/);
  assert.match(page, /const patchFollowingState = \(nextIsFollowing: boolean\) =>/);
  assert.match(page, /queryKeys\.profile\.saved\(\)/);
  assert.match(page, /viewerRelationship: current\.viewerRelationship/);
  assert.match(page, /isFollowing: nextIsFollowing/);
  assert.match(page, /current\.counts\.followers \+ \(nextIsFollowing \? 1 : -1\)/);
});

test("profile header renders owner edit icon separately from visitor actions", async () => {
  const header = await readFile(headerPath, "utf8");

  assert.match(header, /import \{ BadgeCheck, Settings2 \} from "lucide-react"/);
  assert.doesNotMatch(header, /canMessage: boolean;/);
  assert.match(header, /showVisitorActions\?: boolean/);
  assert.match(header, /aria-label="Edit profile"/);
  assert.match(header, /title="Edit profile"/);
  assert.match(header, /<Settings2 className="size-4" \/>/);
  assert.doesNotMatch(header, />\s*Edit\s*</);
  assert.match(header, /!\s*isOwner && showVisitorActions \? \(/);
  assert.match(header, /\) : showVisitorActions \? \(/);
  assert.match(header, /<ActionButtons/);
  assert.match(header, /disabled=\{isFollowPending\}/);
  assert.match(header, /disabled=\{isMessagePending\}/);
  assert.match(header, /Follow/);
  assert.match(header, /Message/);
});
