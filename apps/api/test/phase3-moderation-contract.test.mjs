import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());

const appRoutesPath = path.join(repoRoot, "src/routes/app.routes.ts");
const moderationRoutesPath = path.join(repoRoot, "src/app/moderation/moderation.routes.ts");
const moderationServicePath = path.join(repoRoot, "src/app/moderation/moderation.service.ts");
const moderationModelPath = path.join(repoRoot, "src/models/drizzle/moderation.model.ts");
const reportsValidatorsPath = path.join(repoRoot, "src/app/reports/reports.validators.ts");
const threadsServicePath = path.join(repoRoot, "src/app/threads/threads.service.ts");
const messagesServicePath = path.join(repoRoot, "src/app/messages/messages.service.ts");

test("phase 3 mounts moderation route module", async () => {
	const appRoutesSource = await readFile(appRoutesPath, "utf8");
	assert.match(appRoutesSource, /moderationRouter/);
	assert.match(appRoutesSource, /path: "\/moderation"/);
});

test("moderation routes expose thread and user action endpoints", async () => {
	const routesSource = await readFile(moderationRoutesPath, "utf8");
	assert.match(routesSource, /threads\/:threadId\/lock/);
	assert.match(routesSource, /threads\/:threadId\/remove/);
	assert.match(routesSource, /users\/:userId\/suspension/);
	assert.match(routesSource, /users\/:userId\/feature-restrictions/);
	assert.match(routesSource, /threads\/:threadId\/pseudonyms/);
});

test("moderation service logs sensitive actions to audit logs", async () => {
	const serviceSource = await readFile(moderationServicePath, "utf8");
	assert.match(serviceSource, /THREAD_LOCKED/);
	assert.match(serviceSource, /THREAD_REMOVED/);
	assert.match(serviceSource, /USER_SUSPENDED/);
	assert.match(serviceSource, /USER_FEATURE_RESTRICTION_UPDATED/);
	assert.match(serviceSource, /auditLogs/);
});

test("moderation model defines thread state and feature restriction tables", async () => {
	const modelSource = await readFile(moderationModelPath, "utf8");
	assert.match(modelSource, /threadModerationStates/);
	assert.match(modelSource, /userFeatureRestrictions/);
	assert.match(modelSource, /FEATURE_RESTRICTION_TYPE/);
	assert.match(modelSource, /MODERATION_THREAD_STATE/);
});

test("report validators include expanded target coverage and reason codes", async () => {
	const validatorsSource = await readFile(reportsValidatorsPath, "utf8");
	assert.match(validatorsSource, /TRAINING_LOG/);
	assert.match(validatorsSource, /SAFETY_RESOURCE/);
	assert.match(validatorsSource, /AWARENESS_POST/);
	assert.match(validatorsSource, /MARKETPLACE_LISTING/);
	assert.match(validatorsSource, /COLLABORATION_POST/);
	assert.match(validatorsSource, /DOXXING/);
	assert.match(validatorsSource, /IMPERSONATION/);
});

test("thread and message services enforce moderator feature restrictions", async () => {
	const threadsSource = await readFile(threadsServicePath, "utf8");
	const messagesSource = await readFile(messagesServicePath, "utf8");
	assert.match(threadsSource, /CHIKA_POSTING_DISABLED/);
	assert.match(messagesSource, /DM_DISABLED/);
});
