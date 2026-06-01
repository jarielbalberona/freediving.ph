import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

test("implemented mobile routes have matching deep-link resolver coverage", () => {
  const resolver = read("src/features/shared/links/lib/resolve-fph-link.ts");

  assert.ok(exists("app/(app)/(tabs)/(home)/media/[postId].tsx"));
  assert.ok(exists("app/(app)/(tabs)/(home)/groups/[slug].tsx"));
  assert.ok(exists("app/(app)/(tabs)/(home)/events/[slug]/pass/[token].tsx"));
  assert.ok(exists("app/(app)/(tabs)/(home)/schools/[slug]/courses/[courseSlug].tsx"));
  assert.ok(exists("app/(app)/(tabs)/(home)/schools/bookings/index.tsx"));
  assert.ok(exists("app/(app)/(tabs)/(home)/instructors/[username].tsx"));
  assert.ok(exists("app/(app)/(tabs)/(home)/saved.tsx"));

  assert.match(resolver, /\/\(app\)\/\(tabs\)\/\(home\)\/media/);
  assert.match(resolver, /\/\(app\)\/\(tabs\)\/\(home\)\/groups/);
  assert.match(resolver, /\/\(app\)\/\(tabs\)\/\(home\)\/events/);
  assert.match(resolver, /\/\(app\)\/\(tabs\)\/\(home\)\/schools/);
  assert.match(resolver, /\/\(app\)\/\(tabs\)\/\(home\)\/instructors/);
  assert.match(resolver, /\/\(app\)\/\(tabs\)\/\(home\)\/saved/);
});

test("auth and account routes resolve explicitly instead of username fallback", () => {
  const resolver = read("src/features/shared/links/lib/resolve-fph-link.ts");

  assert.match(resolver, /parts\[0\] === "sign-in"/);
  assert.match(resolver, /parts\[0\] === "sign-up"/);
  assert.match(resolver, /parts\[0\] === "onboarding"/);
  assert.match(resolver, /parts\[0\] === "profile" && parts\.length === 1/);
  assert.match(resolver, /\/\(app\)\/\(tabs\)\/profile\/settings/);
  assert.match(resolver, /RESERVED_TOP_LEVEL_ROUTES/);
});

test("notification routing reuses the hardened link resolver and fallback", () => {
  const notificationFormat = read("src/features/notifications/lib/notification-format.ts");
  const listener = read(
    "src/features/notifications/components/push-notification-route-listener.tsx",
  );

  assert.match(notificationFormat, /resolveFphLink/);
  assert.match(notificationFormat, /notificationsFallbackHref/);
  assert.match(listener, /notificationHrefFromActionUrl/);
  assert.match(listener, /notificationsFallbackHref/);
  assert.doesNotMatch(listener, /eval|Function|JSON\.parse/);
});
