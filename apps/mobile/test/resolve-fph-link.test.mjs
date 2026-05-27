import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(
  root,
  "src/features/shared/links/lib/resolve-fph-link.ts",
);

const source = fs
  .readFileSync(sourcePath, "utf8")
  .replace(
    /import \{ FPH_PUBLIC_LINK_HOSTS } from ".*?";/,
    'const FPH_PUBLIC_LINK_HOSTS = new Set(["freediving.ph", "www.freediving.ph"]);',
  );

const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, URL }, {
  filename: sourcePath,
});

const { resolveFphLink } = module.exports;

const assertNative = (rawUrl, href) => {
  const resolution = resolveFphLink(rawUrl);
  assert.equal(resolution.type, "native");
  assert.equal(resolution.href, href);
};

const assertUnsupported = (rawUrl) => {
  const resolution = resolveFphLink(rawUrl);
  assert.equal(resolution.type, "unsupported-internal");
};

test("resolves confirmed Freediving Philippines URLs to native mobile routes", () => {
  assertNative("https://freediving.ph/chika", "/(app)/(tabs)/chika");
  assertNative(
    "https://freediving.ph/chika/some-thread",
    "/(app)/(tabs)/chika/some-thread",
  );
  assertNative(
    "https://freediving.ph/chika/create",
    "/(app)/(tabs)/chika/post",
  );
  assertNative("https://freediving.ph/events", "/(app)/(tabs)/(home)/events");
  assertNative(
    "https://freediving.ph/events/some-event",
    "/(app)/(tabs)/(home)/events/some-event",
  );
  assertNative("https://freediving.ph/explore", "/(app)/(tabs)/(home)/explore");
  assertNative(
    "https://freediving.ph/explore/sites/anilao",
    "/(app)/(tabs)/(home)/explore/anilao",
  );
  assertNative(
    "https://freediving.ph/explore/anilao",
    "/(app)/(tabs)/(home)/explore/anilao",
  );
  assertNative(
    "https://freediving.ph/groups/some-group",
    "/(app)/(tabs)/(home)/groups/some-group",
  );
  assertNative(
    "https://freediving.ph/profile/jariel",
    "/(app)/(tabs)/(home)/profile/jariel",
  );
  assertNative(
    "https://freediving.ph/jariel",
    "/(app)/(tabs)/(home)/profile/jariel",
  );
  assertNative(
    "https://www.freediving.ph/chika/foo",
    "/(app)/(tabs)/chika/foo",
  );
  assertNative(
    "/events/foo?utm_source=test",
    "/(app)/(tabs)/(home)/events/foo",
  );
  assertNative("/events/foo/", "/(app)/(tabs)/(home)/events/foo");
});

test("keeps unsupported internal URLs on browser fallback", () => {
  assertUnsupported("https://freediving.ph/admin");
  assertUnsupported("https://freediving.ph/schools");
  assertUnsupported("https://freediving.ph/instructor/apply");
  assertUnsupported("https://freediving.ph/media");
  assertUnsupported("https://freediving.ph/jariel/posts/post-1");
  assertUnsupported("https://freediving.ph/events/some-event/manage");
  assertUnsupported("https://freediving.ph/explore/submissions");
});

test("keeps external, malformed, and non-http URLs external", () => {
  const external = resolveFphLink("https://example.com/events/foo");
  assert.equal(external.type, "external");
  assert.equal(external.url, "https://example.com/events/foo");
  assert.equal(resolveFphLink("https://").type, "external");
  assert.equal(resolveFphLink("mailto:test@example.com").type, "external");
});
