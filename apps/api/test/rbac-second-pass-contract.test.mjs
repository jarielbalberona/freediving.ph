import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());

const authMiddlewarePath = path.join(repoRoot, "src/middlewares/auth.ts");
const notificationsControllerPath = path.join(repoRoot, "src/app/notifications/notifications.controller.ts");
const threadsControllerPath = path.join(repoRoot, "src/app/threads/threads.controller.ts");
const threadsServicePath = path.join(repoRoot, "src/app/threads/threads.service.ts");

test("rbac second pass keeps required auth context invariants", async () => {
  const authSource = await readFile(authMiddlewarePath, "utf8");

  assert.match(authSource, /appUserId: appUser\.id/);
  assert.match(authSource, /globalRole: appUser\.globalRole/);
  assert.doesNotMatch(authSource, /legacyUserId|legacyUsername/);
  assert.match(authSource, /username: appUser\.username \?\? null/);
});

test("rbac second pass removes legacy req.user mutation and usage", async () => {
  const authSource = await readFile(authMiddlewarePath, "utf8");
  const notificationsSource = await readFile(notificationsControllerPath, "utf8");
  const threadsControllerSource = await readFile(threadsControllerPath, "utf8");

  assert.doesNotMatch(authSource, /req\.user\s*=/);
  assert.doesNotMatch(authSource, /interface Request[\s\S]*user\?:/);
  assert.doesNotMatch(notificationsSource, /request\.user|req\.user/);
  assert.doesNotMatch(threadsControllerSource, /request\.user|req\.user/);
});

test("notifications authorization uses globalRole and owner checks for forbidden path", async () => {
  const notificationsSource = await readFile(notificationsControllerPath, "utf8");

  assert.match(notificationsSource, /hasMinimumGlobalRole/);
  assert.match(notificationsSource, /Cannot access another user's notifications/);
  assert.match(notificationsSource, /this\.request\.context!\.globalRole/);
  assert.match(notificationsSource, /this\.request\.context!\.appUserId!/);
});

test("blocked user behavior remains enforced at auth boundary", async () => {
  const authSource = await readFile(authMiddlewarePath, "utf8");

  assert.match(authSource, /appUser\.status === "suspended"/);
  assert.match(authSource, /apiResponse\.forbiddenResponse\("Account suspended"\)/);
});

test("golden path contract: thread update/delete flow uses context role and identity", async () => {
  const threadsControllerSource = await readFile(threadsControllerPath, "utf8");
  const threadsServiceSource = await readFile(threadsServicePath, "utf8");

  assert.match(threadsControllerSource, /this\.request\.context!\.appUserId!/);
  assert.match(threadsControllerSource, /this\.request\.context!\.globalRole/);
  assert.match(threadsServiceSource, /hasMinimumGlobalRole\(role, "moderator"\)/);
  assert.match(threadsServiceSource, /Only thread owner or moderator can update this thread/);
});
