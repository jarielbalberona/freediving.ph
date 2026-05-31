import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("profile dive map UI consumes server contracts and proof APIs", () => {
  const routes = readFileSync("src/lib/api/fphgo-routes.ts", "utf8");
  const api = readFileSync("src/features/profiles/api/profiles.ts", "utf8");
  const component = readFileSync(
    "src/features/profile/components/ProfileDiveMap.tsx",
    "utf8",
  );
  const tabs = readFileSync(
    "src/features/profile/components/ProfileTabs.tsx",
    "utf8",
  );

  assert.match(routes, /profileDiveMap:/);
  assert.match(routes, /profileDiveMapSite:/);
  assert.match(api, /ProfileDiveMapResponse/);
  assert.match(api, /ProfileDiveMapSiteResponse/);
  assert.match(component, /ProfileDiveMapMarker/);
  assert.match(component, /MapProvider/);
  assert.match(component, /from "@vis\.gl\/react-google-maps"/);
  assert.match(component, /markersWithCoordinates/);
  assert.match(component, /Map coordinates unavailable/);
  assert.match(component, /mediaPostCount/);
  assert.match(component, /aria-pressed=\{active\}/);
  assert.match(component, /Proof media is not visible\./);
  assert.match(component, /memories/);
  assert.match(component, /marker\.mediaPostCount/);
  assert.doesNotMatch(component, /visitedSiteCount.*memories|unlock.*memories|ProfileDiveMemories/i);
  assert.match(tabs, /<ProfileDiveMap username=\{username\} isOwner=\{isOwner\} \/>/);
});
