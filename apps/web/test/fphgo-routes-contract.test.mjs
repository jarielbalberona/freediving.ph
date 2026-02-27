import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());
const routesPath = path.join(repoRoot, "src/lib/api/fphgo-routes.ts");

test("all FPHGO route literals are versioned with /v1", async () => {
  const source = await readFile(routesPath, "utf8");

  const literalMatches = [...source.matchAll(/=>\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(literalMatches.length > 0, "expected at least one route literal");

  for (const route of literalMatches) {
    assert.match(route, /^\/v1(\/|$)/, `route is not /v1-prefixed: ${route}`);
  }
});

test("messages, chika, and buddies builders map to fphgo v1 prefixes", async () => {
  const source = await readFile(routesPath, "utf8");

  assert.match(source, /me: \(\) => "\/v1\/auth\/session"/);
  assert.match(source, /inbox: \(\) => "\/v1\/messages\/inbox"/);
  assert.match(source, /createRequest: \(\) => "\/v1\/messages\/requests"/);
  assert.match(source, /requestAccept: \(requestId: string \| number\) =>/);
  assert.match(source, /conversationById: \(conversationId: string \| number\) =>/);
  assert.match(source, /read: \(\) => "\/v1\/messages\/read"/);
  assert.match(source, /categories: \(\) => "\/v1\/chika\/categories"/);
  assert.match(source, /list: \(\) => "\/v1\/chika\/threads"/);
  assert.match(source, /list: \(\) => "\/v1\/buddies"/);
  assert.match(source, /createRequest: \(\) => "\/v1\/buddies\/requests"/);
  assert.match(source, /incomingRequests: \(\) => "\/v1\/buddies\/requests\/incoming"/);
  assert.match(source, /outgoingRequests: \(\) => "\/v1\/buddies\/requests\/outgoing"/);
});
