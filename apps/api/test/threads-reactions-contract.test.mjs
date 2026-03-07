import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());
const servicePath = path.join(repoRoot, "src/app/threads/threads.service.ts");
const modelPath = path.join(repoRoot, "src/models/drizzle/threads.model.ts");
const routesPath = path.join(repoRoot, "src/app/threads/threads.routes.ts");

test("reactions table has uniqueness constraints for thread and comment reactions", async () => {
	const modelSource = await readFile(modelPath, "utf8");

	assert.match(modelSource, /reactions_user_thread_unique_idx/);
	assert.match(modelSource, /reactions_user_comment_unique_idx/);
});

test("threads service handles reaction insert collisions and keeps update fallback", async () => {
	const serviceSource = await readFile(servicePath, "utf8");

	assert.match(serviceSource, /code === "23505"/);
	assert.match(serviceSource, /Reaction updated successfully/);
	assert.match(serviceSource, /COUNT\(DISTINCT \$\{comments\.id\}\)/);
});

test("threads routes expose delete endpoint for /threads/:id", async () => {
	const routesSource = await readFile(routesPath, "utf8");

	assert.match(routesSource, /\.delete\(clerkAuthMiddleware/);
	assert.match(routesSource, /deleteThreads\(\)/);
});
