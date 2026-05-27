import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const loadTypescriptModule = (
  relativePath,
  transform = (value) => value,
  context = {},
) => {
  const sourcePath = path.join(root, relativePath);
  const source = transform(fs.readFileSync(sourcePath, "utf8"));
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    output,
    { module, exports: module.exports, URL, ...context },
    {
      filename: sourcePath,
    },
  );
  return module.exports;
};

const { resolveFphLink } = loadTypescriptModule(
  "src/features/shared/links/lib/resolve-fph-link.ts",
  (source) =>
    source.replace(
      /import \{ FPH_PUBLIC_LINK_HOSTS } from ".*?";/,
      'const FPH_PUBLIC_LINK_HOSTS = new Set(["freediving.ph", "www.freediving.ph"]);',
    ),
);
const { parseLinkedText } = loadTypescriptModule(
  "src/features/shared/links/lib/parse-linked-text.ts",
);
const { notificationHrefFromActionUrl } = loadTypescriptModule(
  "src/features/notifications/lib/notification-format.ts",
  (source) =>
    source
      .replace(/import type .*?;\n\n/gs, "")
      .replace(
        /import \{ resolveFphLink } from ".*?";/,
        "const resolveFphLink = __resolveFphLink;",
      ),
  { __resolveFphLink: resolveFphLink },
);

const assertNative = (rawUrl, href) => {
  const resolution = resolveFphLink(rawUrl);
  assert.equal(resolution.type, "native");
  assert.equal(resolution.href, href);
};

const assertUnsupported = (rawUrl) => {
  const resolution = resolveFphLink(rawUrl);
  assert.equal(resolution.type, "unsupported-internal");
};

const assertExternal = (rawUrl) => {
  const resolution = resolveFphLink(rawUrl);
  assert.equal(resolution.type, "external");
};

const assertParts = (input, expected) => {
  assert.deepEqual(JSON.parse(JSON.stringify(parseLinkedText(input))), expected);
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
  assertUnsupported("https://freediving.ph/explore/submissions/site-1");
  assertUnsupported("https://freediving.ph/explore/submit");
  assertUnsupported("https://freediving.ph/explore/updates");
  for (const pathSegment of [
    "events",
    "chika",
    "explore",
    "groups",
    "schools",
    "instructor",
    "admin",
    "moderation",
    "media",
    "features",
    "guides",
    "freediving",
    "about-us",
    "safety",
    "awareness",
    "messages",
    "notifications",
    "buddies",
    "sign-in",
    "sign-up",
  ]) {
    const resolution = resolveFphLink(`https://freediving.ph/${pathSegment}`);
    assert.notEqual(resolution.href, "/(app)/(tabs)/(home)/profile/" + pathSegment);
  }
});

test("keeps external, malformed, and non-http URLs external", () => {
  const external = resolveFphLink("https://example.com/events/foo");
  assert.equal(external.type, "external");
  assert.equal(external.url, "https://example.com/events/foo");
  assertExternal("https://");
  assertExternal("mailto:test@example.com");
  assertExternal("tel:+639171234567");
  assertExternal("javascript:alert(1)");
  assertExternal("data:text/plain,hello");
  assertExternal("//evil.example/events/foo");
});

test("notification action URLs use the shared native resolver safely", () => {
  assert.equal(
    notificationHrefFromActionUrl("/events/some-event"),
    "/(app)/(tabs)/(home)/events/some-event",
  );
  assert.equal(
    notificationHrefFromActionUrl("/chika/some-thread"),
    "/(app)/(tabs)/chika/some-thread",
  );
  assert.equal(
    notificationHrefFromActionUrl("/explore/sites/anilao"),
    "/(app)/(tabs)/(home)/explore/anilao",
  );
  assert.equal(
    notificationHrefFromActionUrl("/explore/anilao"),
    "/(app)/(tabs)/(home)/explore/anilao",
  );
  assert.equal(
    notificationHrefFromActionUrl("/profile/jariel"),
    "/(app)/(tabs)/(home)/profile/jariel",
  );
  assert.equal(
    notificationHrefFromActionUrl("/buddies"),
    "/(app)/(tabs)/(home)/buddies",
  );
  assert.equal(
    notificationHrefFromActionUrl("https://freediving.ph/events/some-event"),
    "/(app)/(tabs)/(home)/events/some-event",
  );
  assert.equal(notificationHrefFromActionUrl("/schools"), undefined);
  assert.equal(notificationHrefFromActionUrl("/explore/submissions"), undefined);
  assert.equal(notificationHrefFromActionUrl("https://example.com/events/foo"), undefined);
  assert.equal(notificationHrefFromActionUrl("//evil.example/events/foo"), undefined);
  assert.equal(notificationHrefFromActionUrl("javascript:alert(1)"), undefined);
  assert.equal(notificationHrefFromActionUrl(undefined), undefined);
});

test("parses plain text links without requiring React Native rendering", () => {
  assertParts("Check https://freediving.ph/chika/foo now", [
    { type: "text", text: "Check " },
    {
      type: "link",
      text: "https://freediving.ph/chika/foo",
      url: "https://freediving.ph/chika/foo",
    },
    { type: "text", text: " now" },
  ]);
  assertParts("https://freediving.ph/events/foo starts", [
    {
      type: "link",
      text: "https://freediving.ph/events/foo",
      url: "https://freediving.ph/events/foo",
    },
    { type: "text", text: " starts" },
  ]);
  assertParts("Open https://freediving.ph/groups/foo", [
    { type: "text", text: "Open " },
    {
      type: "link",
      text: "https://freediving.ph/groups/foo",
      url: "https://freediving.ph/groups/foo",
    },
  ]);
  assertParts(
    "A https://freediving.ph/chika/a and https://example.com/b",
    [
      { type: "text", text: "A " },
      {
        type: "link",
        text: "https://freediving.ph/chika/a",
        url: "https://freediving.ph/chika/a",
      },
      { type: "text", text: " and " },
      { type: "link", text: "https://example.com/b", url: "https://example.com/b" },
    ],
  );
  assertParts("Go https://freediving.ph/events/foo.", [
    { type: "text", text: "Go " },
    {
      type: "link",
      text: "https://freediving.ph/events/foo",
      url: "https://freediving.ph/events/foo",
    },
    { type: "text", text: "." },
  ]);
  assertParts("Go https://freediving.ph/events/foo,", [
    { type: "text", text: "Go " },
    {
      type: "link",
      text: "https://freediving.ph/events/foo",
      url: "https://freediving.ph/events/foo",
    },
    { type: "text", text: "," },
  ]);
  assertParts("(https://freediving.ph/events/foo)", [
    { type: "text", text: "(" },
    {
      type: "link",
      text: "https://freediving.ph/events/foo",
      url: "https://freediving.ph/events/foo",
    },
    { type: "text", text: ")" },
  ]);
  assertParts("Go /events/foo?utm_source=test#details", [
    { type: "text", text: "Go " },
    {
      type: "link",
      text: "/events/foo?utm_source=test#details",
      url: "/events/foo?utm_source=test#details",
    },
  ]);
  assertParts("Plain text only", [
    { type: "text", text: "Plain text only" },
  ]);
  assertParts("Broken https://", [{ type: "text", text: "Broken https://" }]);
  assertParts("Use https://example.com and https://freediving.ph", [
    { type: "text", text: "Use " },
    { type: "link", text: "https://example.com", url: "https://example.com" },
    { type: "text", text: " and " },
    { type: "link", text: "https://freediving.ph", url: "https://freediving.ph" },
  ]);
  assertParts("Avoid and/or false positive", [
    { type: "text", text: "Avoid and/or false positive" },
  ]);
});
