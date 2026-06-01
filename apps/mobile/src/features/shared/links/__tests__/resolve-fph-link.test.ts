// @ts-nocheck - Executed through the mobile Node test bridge without Node types.
import assert from "node:assert/strict";
import test from "node:test";

import { resolveFphLink } from "../lib/resolve-fph-link";

const assertNative = (rawUrl: string, href: string) => {
  const resolution = resolveFphLink(rawUrl);
  assert.equal(resolution.type, "native");
  assert.equal(resolution.href, href);
};

const assertUnsupported = (rawUrl: string) => {
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
  assertNative(
    "https://freediving.ph/events/some-event/pass/token-1",
    "/(app)/(tabs)/(home)/events/some-event/pass/token-1",
  );
  assertNative(
    "https://freediving.ph/events/some-event/manage",
    "/(app)/(tabs)/(home)/events/some-event/manage",
  );
  assertNative("https://freediving.ph/schools", "/(app)/(tabs)/(home)/schools");
  assertNative(
    "https://freediving.ph/schools/school-one",
    "/(app)/(tabs)/(home)/schools/school-one",
  );
  assertNative(
    "https://freediving.ph/schools/school-one/manage",
    "/(app)/(tabs)/(home)/manage-schools?slug=school-one",
  );
  assertNative(
    "https://freediving.ph/management/schools/school-one",
    "/(app)/(tabs)/(home)/manage-schools?slug=school-one",
  );
  assertNative(
    "https://freediving.ph/schools/school-one/courses/intro-course",
    "/(app)/(tabs)/(home)/schools/school-one/courses/intro-course",
  );
  assertNative(
    "https://freediving.ph/schools/school-one/courses/intro-course/book",
    "/(app)/(tabs)/(home)/schools/school-one/courses/intro-course",
  );
  assertNative("https://freediving.ph/my/bookings", "/(app)/(tabs)/(home)/schools/bookings");
  assertNative(
    "https://freediving.ph/instructor/apply",
    "/(app)/(tabs)/(home)/instructor-application",
  );
  assertNative(
    "https://freediving.ph/instructors/jariel",
    "/(app)/(tabs)/(home)/instructors/jariel",
  );
  assertNative("https://freediving.ph/saved", "/(app)/(tabs)/(home)/saved");
  assertNative("https://freediving.ph/search", "/(app)/(tabs)/search");
  assertNative(
    "https://freediving.ph/admin/moderation",
    "/(app)/(tabs)/(home)/moderation",
  );
  assertNative(
    "https://freediving.ph/admin/moderation/reports/report-1",
    "/(app)/(tabs)/(home)/moderation?reportId=report-1",
  );
  assertNative("https://freediving.ph/sign-in", "/sign-in");
  assertNative("https://freediving.ph/sign-up", "/sign-up");
  assertNative("https://freediving.ph/onboarding", "/onboarding");
  assertNative("https://freediving.ph/guides", "/(app)/(tabs)/(home)/learn");
  assertNative(
    "https://freediving.ph/founder-note",
    "/(app)/(tabs)/(home)/founders-note",
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
  assertNative("https://freediving.ph/messages", "/(app)/(tabs)/messages");
  assertNative(
    "https://freediving.ph/messages/thread-1",
    "/(app)/(tabs)/messages/thread-1",
  );
  assertNative(
    "https://freediving.ph/profile/jariel",
    "/(app)/(tabs)/(home)/profile/jariel",
  );
  assertNative("https://freediving.ph/profile", "/(app)/(tabs)/profile");
  assertNative(
    "https://freediving.ph/profile/settings",
    "/(app)/(tabs)/profile/settings",
  );
  assertNative(
    "https://freediving.ph/jariel",
    "/(app)/(tabs)/(home)/profile/jariel",
  );
  assertNative(
    "https://freediving.ph/jariel/posts/post-1",
    "/(app)/(tabs)/(home)/media/post-1",
  );
  assertNative(
    "https://freediving.ph/profile/jariel/posts/post-1",
    "/(app)/(tabs)/(home)/media/post-1",
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
  assertUnsupported("https://freediving.ph/instructor/admin");
  assertUnsupported("https://freediving.ph/media");
  assertUnsupported("https://freediving.ph/explore/submissions");
});

test("keeps external, malformed, and non-http URLs external", () => {
  assert.deepEqual(resolveFphLink("https://example.com/events/foo"), {
    type: "external",
    url: "https://example.com/events/foo",
  });
  assert.equal(resolveFphLink("https://").type, "external");
  assert.equal(resolveFphLink("mailto:test@example.com").type, "external");
});
