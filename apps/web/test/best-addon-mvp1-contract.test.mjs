import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const cwd = path.resolve(globalThis.process.cwd());
const appRoot = cwd.endsWith(path.join("apps", "web")) ? cwd : path.join(cwd, "apps", "web");

test("best add-on pages and message plan card hooks are wired", async () => {
  const [
    updatesPage,
    savedPage,
    buddySharePage,
    siteSharePage,
    explorePage,
    profilePage,
    messagesPage,
    trustCard,
  ] = await Promise.all([
    readFile(path.join(appRoot, "src/app/explore/updates/page.tsx"), "utf8"),
    readFile(path.join(appRoot, "src/app/saved/page.tsx"), "utf8"),
    readFile(path.join(appRoot, "src/app/buddy/[intentId]/page.tsx"), "utf8"),
    readFile(path.join(appRoot, "src/app/explore/sites/[slug]/page.tsx"), "utf8"),
    readFile(path.join(appRoot, "src/app/explore/page.tsx"), "utf8"),
    readFile(path.join(appRoot, "src/components/profile/profile-view.tsx"), "utf8"),
    readFile(path.join(appRoot, "src/app/messages/page.tsx"), "utf8"),
    readFile(path.join(appRoot, "src/components/trust-card.tsx"), "utf8"),
  ]);

  assert.match(updatesPage, /Latest updates near you/);
  assert.match(updatesPage, /listLatestUpdates/);
  assert.match(updatesPage, /24h/);
  assert.match(updatesPage, /7d/);

  assert.match(savedPage, /Saved Hub/);
  assert.match(savedPage, /Saved Sites/);
  assert.match(savedPage, /Saved Buddies/);

  assert.match(buddySharePage, /Safe preview only/);
  assert.match(buddySharePage, /generateMetadata/);
  assert.match(siteSharePage, /generateMetadata/);
  assert.match(siteSharePage, /openGraph/);

  assert.match(explorePage, /Save site|Save/);
  assert.match(profilePage, /TrustCard/);
  assert.match(profilePage, /Save profile/);

  assert.match(messagesPage, /Attach spot/);
  assert.match(messagesPage, /type: "meet_at"/);
  assert.match(messagesPage, /Meet at/);
  assert.match(messagesPage, /Open site/);

  assert.match(trustCard, /Email verified/);
  assert.match(trustCard, /reports/);
});
