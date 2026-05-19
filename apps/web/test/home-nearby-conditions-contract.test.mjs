import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(globalThis.process.cwd());
const cardPath = path.join(
  appRoot,
  "src/features/home-feed/components/NearbyConditionsCard.tsx",
);
const clientPath = path.join(
  appRoot,
  "src/features/home-feed/api/get-nearby-conditions.ts",
);
const hookPath = path.join(
  appRoot,
  "src/features/home-feed/hooks/queries/useNearbyConditionsQuery.ts",
);
const routesPath = path.join(appRoot, "src/lib/api/fphgo-routes.ts");
const homePagePath = path.join(
  appRoot,
  "src/features/home-feed/components/HomeFeedPage.tsx",
);

test("nearby conditions uses backend endpoint and never calls weather providers from web", async () => {
  const [routes, client, hook, card, homePage] = await Promise.all([
    readFile(routesPath, "utf8"),
    readFile(clientPath, "utf8"),
    readFile(hookPath, "utf8"),
    readFile(cardPath, "utf8"),
    readFile(homePagePath, "utf8"),
  ]);

  assert.match(
    routes,
    /nearbyConditions: \(\) => "\/v1\/home\/nearby-conditions"/,
  );
  assert.match(client, /routes\.v1\.home\.nearbyConditions\(\)/);
  assert.match(hook, /queryKey: \[/);
  assert.match(hook, /"nearby-conditions"/);
  assert.match(homePage, /<NearbyConditionsCard \/>/);
  assert.match(card, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(card, /Check locally/);
  assert.match(card, /Visibility and current are reported when available/);
  assert.match(card, /confidenceLabel/);
  assert.doesNotMatch(client + hook + card, /open-meteo/i);
  assert.doesNotMatch(client + hook + card, /weatherapi/i);
  assert.doesNotMatch(client + hook + card, /api\.openweathermap/i);
});
