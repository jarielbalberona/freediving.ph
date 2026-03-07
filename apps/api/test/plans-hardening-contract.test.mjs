import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());
const trainingRoutesPath = path.join(repoRoot, "src/app/trainingLogs/trainingLogs.routes.ts");
const safetyRoutesPath = path.join(repoRoot, "src/app/safetyResources/safetyResources.routes.ts");
const awarenessValidatorsPath = path.join(repoRoot, "src/app/awareness/awareness.validators.ts");
const marketplaceServicePath = path.join(repoRoot, "src/app/marketplace/marketplace.service.ts");
const collaborationServicePath = path.join(repoRoot, "src/app/collaboration/collaboration.service.ts");

test("training logs routes expose update/delete and metric upsert endpoints", async () => {
	const routesSource = await readFile(trainingRoutesPath, "utf8");

	assert.match(routesSource, /router\.patch\(\"\/:id\"/);
	assert.match(routesSource, /updateSession\(\)/);
	assert.match(routesSource, /router\.delete\(\"\/:id\"/);
	assert.match(routesSource, /deleteSession\(\)/);
	assert.match(routesSource, /router\.get\(\"\/:id\/metrics\"/);
	assert.match(routesSource, /router\.put\(\"\/:id\/metrics\"/);
});

test("safety resources routes include rollback and stale review endpoints", async () => {
	const routesSource = await readFile(safetyRoutesPath, "utf8");

	assert.match(routesSource, /router\.post\(\"\/pages\/:id\/rollback\"/);
	assert.match(routesSource, /router\.get\(\"\/pages\/stale\"/);
	assert.match(routesSource, /requireRole\(\"EDITOR\"\)/);
});

test("awareness validators require source citations for advisory posts", async () => {
	const validatorsSource = await readFile(awarenessValidatorsPath, "utf8");

	assert.match(validatorsSource, /topicType === \"ADVISORY\"/);
	assert.match(validatorsSource, /sourceUrl/);
	assert.match(validatorsSource, /Advisories require a source URL citation/);
});

test("marketplace service enforces account age, cooldown, and suspicious link checks", async () => {
	const serviceSource = await readFile(marketplaceServicePath, "utf8");

	assert.match(serviceSource, /Account must be at least 24h old to post listings/);
	assert.match(serviceSource, /Listing cooldown active/);
	assert.match(serviceSource, /suspicious link patterns/);
});

test("collaboration service enforces account age and posting cooldown", async () => {
	const serviceSource = await readFile(collaborationServicePath, "utf8");

	assert.match(serviceSource, /Account must be at least 24h old to post collaboration offers/);
	assert.match(serviceSource, /Posting cooldown active/);
});
