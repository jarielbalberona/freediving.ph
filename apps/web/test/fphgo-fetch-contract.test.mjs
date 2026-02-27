import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());
const fetchPath = path.join(repoRoot, "src/lib/api/fphgo-fetch.ts");

test("fphgo fetch attaches bearer token when present", async () => {
  const source = await readFile(fetchPath, "utf8");

  assert.match(source, /const token = init\.token === undefined \? await tokenProvider\(\) : init\.token/);
  assert.match(source, /headers\.set\("Authorization", `Bearer \$\{token\}`\)/);
});

test("fphgo fetch enforces /v1 path prefix in development", async () => {
  const source = await readFile(fetchPath, "utf8");

  assert.match(source, /if \(process\.env\.NODE_ENV === "development" && !path\.startsWith\("\/v1\/"\)\)/);
  assert.match(source, /FPHGO path must start with \/v1\//);
});

