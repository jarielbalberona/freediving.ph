import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(globalThis.process.cwd());
const srcRoot = path.join(appRoot, "src");

const readSource = (relativePath) =>
  readFile(path.join(srcRoot, relativePath), "utf8");

test("app sidebar derives Learn and Founder note footer links from nav config", async () => {
  const [sidebar, nav, sharedNav] = await Promise.all([
    readSource("components/ui/app-sidebar.tsx"),
    readSource("config/nav.ts"),
    readFile(
      path.join(appRoot, "../../packages/types/src/navigation.ts"),
      "utf8",
    ),
  ]);

  assert.match(sidebar, /getSidebarFooterNavItems/);
  assert.match(sidebar, /sidebarFooterItems\.map/);
  assert.doesNotMatch(sidebar, /href="\/guides"/);
  assert.doesNotMatch(sidebar, />Learn</);

  assert.match(nav, /id: "learn"[\s\S]*?href: "\/guides"/);
  assert.match(nav, /id: "learn"[\s\S]*?icon: BookOpen/);
  assert.match(nav, /id: "founders-note"[\s\S]*?href: "\/founder-note"/);
  assert.match(nav, /id: "founders-note"[\s\S]*?icon: Info/);
  assert.match(nav, /getSidebarFooterNavItems/);
  assert.match(nav, /platforms\.includes\("web"\)/);
  assert.doesNotMatch(nav, /id: "search"/);

  const learnIndex = sharedNav.indexOf('id: "learn"');
  const founderIndex = sharedNav.indexOf('id: "founders-note"');
  assert.ok(learnIndex > -1, "Learn contract is missing");
  assert.ok(founderIndex > -1, "Founder’s Note contract is missing");
  assert.ok(
    learnIndex < founderIndex,
    "Learn should come before Founder’s Note",
  );

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
        import { getMobileMainNavItems, getSidebarFooterNavItems, isActiveRoute } from "./src/config/nav.ts";

        assert.equal(isActiveRoute("/guides", "/guides"), true);
        assert.equal(isActiveRoute("/guides/freediving-safety-basics", "/guides"), true);
        assert.equal(isActiveRoute("/features/dive-spots", "/guides"), false);
        assert.equal(isActiveRoute("/about-us", "/guides"), false);
        assert.deepEqual(
          getSidebarFooterNavItems({ isSignedIn: true }).map((item) => item.id),
          ["learn", "founders-note"],
        );
        assert.deepEqual(
          getMobileMainNavItems({ isSignedIn: true }).map((item) => item.id),
          ["home", "chika", "create", "messages", "profile"],
        );

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
