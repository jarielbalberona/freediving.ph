import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web"))
  ? cwd
  : path.join(cwd, "apps", "web");
const componentRoot = path.join(appRoot, "src/components/product");
const parkedPagePath = path.join(componentRoot, "parked-feature-page.tsx");
const parkedLinksPath = path.join(componentRoot, "parked-feature-links.tsx");

test("parked feature pages keep button styling behind a client boundary", async () => {
  const [page, links] = await Promise.all([
    readFile(parkedPagePath, "utf8"),
    readFile(parkedLinksPath, "utf8"),
  ]);

  assert.doesNotMatch(page, /"use client"/);
  assert.doesNotMatch(page, /buttonVariants/);
  assert.doesNotMatch(page, /@\/components\/ui\/button/);
  assert.match(page, /<ParkedFeatureLinks \/>/);

  assert.match(links, /"use client"/);
  assert.match(links, /buttonVariants/);
  assert.match(links, /Explore dive spots/);
});
