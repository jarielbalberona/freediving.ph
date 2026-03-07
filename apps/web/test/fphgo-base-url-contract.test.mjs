import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());
const baseUrlPath = path.join(repoRoot, "src/lib/api/fphgo-base-url.ts");

test("fphgo base URL helper exposes client and server readers", async () => {
  const source = await readFile(baseUrlPath, "utf8");

  assert.match(source, /export const getFphgoBaseUrlClient/);
  assert.match(source, /NEXT_PUBLIC_FPHGO_BASE_URL/);
  assert.match(source, /export const getFphgoBaseUrlServer/);
  assert.match(source, /FPHGO_BASE_URL/);
});

test("fphgo base URL helper normalizes trailing slashes", async () => {
  const source = await readFile(baseUrlPath, "utf8");

  assert.match(source, /replace\(\/\\\/\+\$\/, ""\)/);
});

