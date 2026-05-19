import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());

const middlewarePath = path.join(repoRoot, "src/middleware.ts");
const authGuardPath = path.join(repoRoot, "src/components/auth/guard.tsx");
const rolesPath = path.join(repoRoot, "src/lib/auth/roles.ts");
const notificationsHooksPath = path.join(
  repoRoot,
  "src/features/notifications/hooks/queries.ts",
);
const chikaMutationsPath = path.join(
  repoRoot,
  "src/features/chika/hooks/mutations.ts",
);
const chikaCreatePath = path.join(repoRoot, "src/app/chika/create/page.tsx");
const chikaThreadsPath = path.join(repoRoot, "src/app/chika/threads.tsx");
const threadDetailPath = path.join(
  repoRoot,
  "src/features/chika/components/ThreadDetail.tsx",
);
const messagesViewPath = path.join(
  repoRoot,
  "src/features/messages/components/MessagingView.tsx",
);

test("phase 6 protects auth-required frontend routes in middleware", async () => {
  const middlewareSource = await readFile(middlewarePath, "utf8");
  assert.match(middlewareSource, /createRouteMatcher/);
  assert.match(middlewareSource, /"\/messages\(\.\*\)"/);
  assert.match(middlewareSource, /"\/chika\/create\(\.\*\)"/);
  assert.match(middlewareSource, /await auth\.protect\(\)/);
});

test("phase 6 has centralized auth guard and role normalization helpers", async () => {
  const guardSource = await readFile(authGuardPath, "utf8");
  const rolesSource = await readFile(rolesPath, "utf8");
  assert.match(guardSource, /requiredRole = "MEMBER"/);
  assert.match(guardSource, /hasRequiredRole/);
  assert.match(rolesSource, /normalizeRole/);
  assert.match(rolesSource, /ROLE_RANK/);
});

test("phase 6 uses identity-scoped notification queries", async () => {
  const source = await readFile(notificationsHooksPath, "utf8");
  assert.match(source, /queryKey: \['notifications', filters\]/);
  assert.doesNotMatch(source, /Number\.isInteger\(userId\)/);
});

test("phase 6 removes unsafe optimistic chika reaction updates", async () => {
  const source = await readFile(chikaMutationsPath, "utf8");
  assert.doesNotMatch(source, /setQueryData\(\["threads", id\]/);
  assert.match(
    source,
    /invalidateQueries\(\{ queryKey: \["threads", id\] \}\)/,
  );
});

test("phase 6 hardens chika posting and moderation placeholders in UI", async () => {
  const createSource = await readFile(chikaCreatePath, "utf8");
  const threadsSource = await readFile(chikaThreadsPath, "utf8");
  const detailSource = await readFile(threadDetailPath, "utf8");
  const messagesSource = await readFile(messagesViewPath, "utf8");

  assert.match(createSource, /<AuthGuard/);
  assert.match(threadsSource, /Hidden/);
  assert.match(detailSource, /ReportAction/);
  assert.match(detailSource, /Hidden since/);
  assert.match(messagesSource, /Message request/);
  assert.match(messagesSource, /Accept this request before you can reply/);
});
