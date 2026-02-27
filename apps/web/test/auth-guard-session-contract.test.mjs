import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());
const guardPath = path.join(repoRoot, "src/components/auth/guard.tsx");

test("AuthGuard redirects signed-out users to sign-in", async () => {
  const source = await readFile(guardPath, "utf8");

  assert.match(source, /shouldRedirectToSignIn/);
  assert.match(source, /router\.replace\("\/sign-in"\)/);
});

test("AuthGuard keeps loading state while session is loading", async () => {
  const source = await readFile(guardPath, "utf8");

  assert.match(source, /const isSessionLoading = !isLoaded \|\| session\.status === "loading"/);
  assert.match(source, /if \(isSessionLoading\)/);
  assert.match(source, /<Skeleton className="h-10 w-64" \/>/);
});

test("AuthGuard enforces role checks only after session data is available", async () => {
  const source = await readFile(guardPath, "utf8");

  assert.match(source, /if \(!session\.me\)/);
  assert.match(source, /const appRole = mapGlobalRoleToAppRole\(session\.me\.globalRole\)/);
});

