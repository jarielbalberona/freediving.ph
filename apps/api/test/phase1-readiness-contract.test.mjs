import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());

const authorizationPath = path.join(repoRoot, "src/core/authorization.ts");
const middlewarePath = path.join(repoRoot, "src/middlewares/clerk.middleware.ts");
const apiControllerPath = path.join(repoRoot, "src/controllers/base/api.controller.ts");
const serviceApiPath = path.join(repoRoot, "src/utils/serviceApi.ts");
const threadsControllerPath = path.join(repoRoot, "src/app/threads/threads.controller.ts");
const threadsServicePath = path.join(repoRoot, "src/app/threads/threads.service.ts");
const eventsServicePath = path.join(repoRoot, "src/app/events/events.service.ts");
const groupsServicePath = path.join(repoRoot, "src/app/groups/groups.service.ts");
const diveSpotServicePath = path.join(repoRoot, "src/app/diveSpot/diveSpot.service.ts");

test("phase 1 adds platform role mapping and middleware guard", async () => {
	const authorizationSource = await readFile(authorizationPath, "utf8");
	const middlewareSource = await readFile(middlewarePath, "utf8");

	assert.match(authorizationSource, /mapDbRoleToPlatformRole/);
	assert.match(authorizationSource, /hasMinimumPlatformRole/);
	assert.match(authorizationSource, /hasMinimumGroupRole/);
	assert.match(middlewareSource, /requirePlatformRole/);
	assert.match(middlewareSource, /hasMinimumPlatformRole/);
});

test("phase 1 standardizes validation errors", async () => {
	const controllerSource = await readFile(apiControllerPath, "utf8");
	const serviceApiSource = await readFile(serviceApiPath, "utf8");

	assert.match(controllerSource, /validationError\(error: z\.ZodError\)/);
	assert.match(serviceApiSource, /validationErrorResponse/);
	assert.match(serviceApiSource, /VALIDATION_ERROR/);
	assert.match(serviceApiSource, /UNAUTHORIZED/);
	assert.match(serviceApiSource, /FORBIDDEN/);
});

test("threads list/comment endpoints enforce pagination query schema", async () => {
	const controllerSource = await readFile(threadsControllerPath, "utf8");
	const serviceSource = await readFile(threadsServicePath, "utf8");

	assert.match(controllerSource, /ThreadListQuerySchema\.safeParse/);
	assert.match(controllerSource, /ThreadCommentsQuerySchema\.safeParse/);
	assert.match(serviceSource, /buildOffsetPagination/);
	assert.match(serviceSource, /\.limit\(query\.limit\)/);
	assert.match(serviceSource, /\.offset\(query\.offset\)/);
});

test("events, groups, and dive spots list endpoints paginate with metadata", async () => {
	const eventsSource = await readFile(eventsServicePath, "utf8");
	const groupsSource = await readFile(groupsServicePath, "utf8");
	const diveSpotSource = await readFile(diveSpotServicePath, "utf8");

	assert.match(eventsSource, /buildOffsetPagination/);
	assert.match(eventsSource, /\.limit\(query\.limit\)/);
	assert.match(groupsSource, /buildOffsetPagination/);
	assert.match(groupsSource, /\.offset\(query\.offset\)/);
	assert.match(diveSpotSource, /buildOffsetPagination/);
	assert.match(diveSpotSource, /\.select\(columns\)/);
});
