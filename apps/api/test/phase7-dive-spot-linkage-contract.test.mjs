import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());

const eventsModelPath = path.join(repoRoot, "src/models/drizzle/events.model.ts");
const futureModulesModelPath = path.join(repoRoot, "src/models/drizzle/futureModules.model.ts");
const eventsServicePath = path.join(repoRoot, "src/app/events/events.service.ts");
const recordsServicePath = path.join(repoRoot, "src/app/competitiveRecords/competitiveRecords.service.ts");
const schemaPath = path.join(repoRoot, "src/databases/drizzle/schema.ts");

test("phase 7 adds explicit dive spot linkage on events and competitive records", async () => {
  const eventsModel = await readFile(eventsModelPath, "utf8");
  const futureModulesModel = await readFile(futureModulesModelPath, "utf8");
  const eventsService = await readFile(eventsServicePath, "utf8");
  const recordsService = await readFile(recordsServicePath, "utf8");

  assert.match(eventsModel, /diveSpotId: integer\("dive_spot_id"\)/);
  assert.match(eventsModel, /events_dive_spot_idx/);

  assert.match(futureModulesModel, /diveSpotId: integer\("dive_spot_id"\)/);
  assert.match(futureModulesModel, /competitive_records_dive_spot_idx/);

  assert.match(eventsService, /eq\(events\.diveSpotId, query\.diveSpotId\)/);
  assert.match(recordsService, /eq\(competitiveRecords\.diveSpotId, query\.diveSpotId\)/);
});

test("phase 7 removes legacy reviews schema registration", async () => {
  const source = await readFile(schemaPath, "utf8");

  assert.doesNotMatch(source, /ReviewsSchema/);
});
