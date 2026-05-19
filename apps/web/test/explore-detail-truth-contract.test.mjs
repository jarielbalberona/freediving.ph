import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web")) ? cwd : path.join(cwd, "apps", "web");
const srcRoot = path.join(appRoot, "src");
const sharePagePath = path.join(srcRoot, "app/explore/sites/[slug]/page.tsx");

async function readSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return readSourceFiles(entryPath);
      if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) return [];
      return [entryPath];
    }),
  );

  return files.flat();
}

test("explore site detail renders real backend data or 404s honestly", async () => {
  const sharePage = await readFile(sharePagePath, "utf8");

  assert.doesNotMatch(sharePage, /mock-data/);
  assert.doesNotMatch(sharePage, /getMockDiveSpotBySlug/);
  assert.doesNotMatch(sharePage, /Mock explore detail page/);
  assert.match(sharePage, /getExploreSiteBySlugServer\(slug\)/);
  assert.match(sharePage, /notFound\(\)/);
});

test("launch source does not import seeded Explore mock data", async () => {
  const sourceFiles = await readSourceFiles(srcRoot);
  const matches = [];

  for (const sourcePath of sourceFiles) {
    const source = await readFile(sourcePath, "utf8");
    if (/MOCK_EXPLORE_SPOTS|getMockDiveSpotBySlug|features\/explore\/mock-data/.test(source)) {
      matches.push(path.relative(appRoot, sourcePath));
    }
  }

  assert.deepEqual(matches, []);
});
