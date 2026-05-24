import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(globalThis.process.cwd());
const srcRoot = path.join(appRoot, "src");

const readSource = (relativePath) =>
  readFile(path.join(srcRoot, relativePath), "utf8");

test("app sidebar includes a lightweight Learn link above Founder note", async () => {
  const sidebar = await readSource("components/ui/app-sidebar.tsx");

  assert.match(sidebar, /BookOpen/);
  assert.match(sidebar, /href="\/guides"/);
  assert.match(sidebar, />Learn</);

  const learnIndex = sidebar.indexOf(">Learn<");
  const founderIndex = sidebar.indexOf(">Founder's Note<");
  assert.ok(learnIndex > -1, "Learn label is missing");
  assert.ok(founderIndex > -1, "Founder's Note label is missing");
  assert.ok(learnIndex < founderIndex, "Learn should appear above Founder's Note");

  assert.doesNotMatch(sidebar, /href="\/features"/);
  assert.doesNotMatch(sidebar, /href="\/about-us"/);
});

test("Learn active matching covers guides without matching features", () => {
  const result = spawnSync(
    path.join(appRoot, "../../node_modules/.bin/tsx"),
    [
      "--eval",
      `
        import assert from "node:assert/strict";
        import { isActiveRoute } from "./src/config/nav.ts";

        assert.equal(isActiveRoute("/guides", "/guides"), true);
        assert.equal(isActiveRoute("/guides/freediving-safety-basics", "/guides"), true);
        assert.equal(isActiveRoute("/features/dive-spots", "/guides"), false);
        assert.equal(isActiveRoute("/about-us", "/guides"), false);

        console.log("ok");
      `,
    ],
    {
      cwd: appRoot,
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), "ok");
});
