import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web")) ? cwd : path.join(cwd, "apps", "web");
const routesPath = path.join(appRoot, "src/lib/api/fphgo-routes.ts");

test("all FPHGO route literals are versioned with /v1", async () => {
  const source = await readFile(routesPath, "utf8");

  const literalMatches = [...source.matchAll(/=>\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(literalMatches.length > 0, "expected at least one route literal");

  for (const route of literalMatches) {
    assert.match(route, /^\/v1(\/|$)/, `route is not /v1-prefixed: ${route}`);
  }
});

test("messages, chika, buddies, and add-on builders map to fphgo v1 prefixes", async () => {
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
  assert.match(source, /saved: \(\) => "\/v1\/me\/saved"/);
  assert.match(source, /saveUser: \(userId: string \| number\) =>/);
  assert.match(source, /latestUpdates: \(\) => "\/v1\/explore\/updates"/);
  assert.match(source, /sharePreview: \(id: string \| number\) =>/);
});
