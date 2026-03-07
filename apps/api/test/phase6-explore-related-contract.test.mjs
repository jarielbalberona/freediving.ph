import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());

const diveSpotRoutesPath = path.join(repoRoot, "src/app/diveSpot/diveSpot.routes.ts");
const diveSpotControllerPath = path.join(repoRoot, "src/app/diveSpot/diveSpot.controller.ts");
const diveSpotServicePath = path.join(repoRoot, "src/app/diveSpot/diveSpot.service.ts");
const eventsValidatorsPath = path.join(repoRoot, "src/app/events/events.validators.ts");
const eventsServicePath = path.join(repoRoot, "src/app/events/events.service.ts");
const buddiesRoutesPath = path.join(repoRoot, "src/app/buddies/buddies.routes.ts");
const buddiesServicePath = path.join(repoRoot, "src/app/buddies/buddies.service.ts");
const recordsValidatorsPath = path.join(repoRoot, "src/app/competitiveRecords/competitiveRecords.validators.ts");
const recordsServicePath = path.join(repoRoot, "src/app/competitiveRecords/competitiveRecords.service.ts");
const appRoutesPath = path.join(repoRoot, "src/routes/app.routes.ts");

test("phase 5 exposes composed dive spot review routes and service handlers", async () => {
  const routesSource = await readFile(diveSpotRoutesPath, "utf8");
  const controllerSource = await readFile(diveSpotControllerPath, "utf8");
  const serviceSource = await readFile(diveSpotServicePath, "utf8");

  assert.match(routesSource, /route\("\/:id\/reviews"\)/);
  assert.match(routesSource, /\/:id\/reviews\/summary/);
  assert.match(controllerSource, /retrieveDiveSpotReviews/);
  assert.match(controllerSource, /retrieveDiveSpotReviewSummary/);
  assert.match(controllerSource, /createDiveSpotReview/);
  assert.match(serviceSource, /createOrUpdateDiveSpotReview/);
  assert.match(serviceSource, /retrieveDiveSpotReviewSummary/);
});

test("phase 6 supports diveSpotId filters for events, buddies, and records", async () => {
  const eventsValidators = await readFile(eventsValidatorsPath, "utf8");
  const eventsService = await readFile(eventsServicePath, "utf8");
  const buddiesRoutes = await readFile(buddiesRoutesPath, "utf8");
  const buddiesService = await readFile(buddiesServicePath, "utf8");
  const recordsValidators = await readFile(recordsValidatorsPath, "utf8");
  const recordsService = await readFile(recordsServicePath, "utf8");
  const appRoutes = await readFile(appRoutesPath, "utf8");

  assert.match(eventsValidators, /EventsListQuerySchema/);
  assert.match(eventsValidators, /diveSpotId/);
  assert.match(eventsService, /query\.diveSpotId/);

  assert.match(buddiesRoutes, /"\/available"/);
  assert.match(buddiesService, /availableNearDiveSpot/);

  assert.match(recordsValidators, /diveSpotId/);
  assert.match(recordsService, /query\.diveSpotId/);

  assert.match(appRoutes, /path: "\/records"/);
});
