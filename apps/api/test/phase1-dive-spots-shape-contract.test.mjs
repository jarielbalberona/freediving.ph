import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());

const diveSpotValidatorsPath = path.join(repoRoot, "src/app/diveSpot/diveSpot.validators.ts");
const diveSpotServicePath = path.join(repoRoot, "src/app/diveSpot/diveSpot.service.ts");
const diveSpotsModelPath = path.join(repoRoot, "src/models/drizzle/diveSpots.model.ts");
const migrationPath = path.join(repoRoot, ".drizzle/migrations/0031_spot_list_shape_indexes.sql");

test("phase 1 validates shape query and viewport bounds", async () => {
  const validatorsSource = await readFile(diveSpotValidatorsPath, "utf8");

  assert.match(validatorsSource, /shape: z\.enum\(\["map", "list"\]\)\.default\("list"\)/);
  assert.match(validatorsSource, /north must be greater than or equal to south/);
  assert.match(validatorsSource, /east must be greater than or equal to west/);
});

test("phase 1 list endpoint includes aggregate fields and shape-specific column sets", async () => {
  const serviceSource = await readFile(diveSpotServicePath, "utf8");

  assert.match(serviceSource, /avgRating:/);
  assert.match(serviceSource, /ratingCount:/);
  assert.match(serviceSource, /commentCount:/);
  assert.match(serviceSource, /query\.shape === "map" \? mapColumns : listColumns/);
  assert.match(serviceSource, /leftJoin\(ratingsAgg/);
  assert.match(serviceSource, /leftJoin\(commentsAgg/);
});

test("phase 1 adds dive spot/ratings/comments indexes and migration", async () => {
  const modelSource = await readFile(diveSpotsModelPath, "utf8");
  const migrationSource = await readFile(migrationPath, "utf8");

  assert.match(modelSource, /dive_spots_state_deleted_lat_lng_idx/);
  assert.match(modelSource, /dive_spot_comments_spot_id_idx/);
  assert.match(modelSource, /dive_spot_ratings_spot_id_idx/);

  assert.match(migrationSource, /CREATE INDEX IF NOT EXISTS "dive_spots_state_deleted_lat_lng_idx"/);
  assert.match(migrationSource, /CREATE INDEX IF NOT EXISTS "dive_spot_comments_spot_id_idx"/);
  assert.match(migrationSource, /CREATE INDEX IF NOT EXISTS "dive_spot_ratings_spot_id_idx"/);
});
