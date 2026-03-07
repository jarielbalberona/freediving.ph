import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());

const appPath = path.join(repoRoot, "src/app.ts");
const loggerPath = path.join(repoRoot, "src/logger.ts");
const routesPath = path.join(repoRoot, "src/routes/app.routes.ts");
const metricsPath = path.join(repoRoot, "src/observability/metrics.ts");
const requestContextPath = path.join(repoRoot, "src/observability/requestContext.ts");
const resiliencePath = path.join(repoRoot, "src/utils/resilience.ts");
const serverPath = path.join(repoRoot, "src/server.ts");
const emailServicePath = path.join(repoRoot, "src/service/emailService.ts");
const mediaControllerPath = path.join(repoRoot, "src/app/media/media.controller.ts");

test("phase 4 wires request context and metrics middleware into app", async () => {
	const appSource = await readFile(appPath, "utf8");
	assert.match(appSource, /requestContextMiddleware/);
	assert.match(appSource, /metricsMiddleware/);
	assert.match(appSource, /app\.use\(requestContextMiddleware\)/);
	assert.match(appSource, /app\.use\(metricsMiddleware\)/);
});

test("phase 4 logger emits structured JSON with request id", async () => {
	const loggerSource = await readFile(loggerPath, "utf8");
	assert.match(loggerSource, /requestId: req\.requestId/);
	assert.match(loggerSource, /JSON\.stringify\(logLine\)/);
	assert.match(loggerSource, /durationMs/);
});

test("phase 4 exposes metrics and readiness endpoints", async () => {
	const routesSource = await readFile(routesPath, "utf8");
	assert.match(routesSource, /path: "\/metrics"/);
	assert.match(routesSource, /healthRouter\.get\("\/ready"/);
	assert.match(routesSource, /healthRouter\.get\("\/live"/);
	assert.match(routesSource, /getMetricsSnapshot/);
});

test("phase 4 adds observability and resilience utilities", async () => {
	const metricsSource = await readFile(metricsPath, "utf8");
	const requestContextSource = await readFile(requestContextPath, "utf8");
	const resilienceSource = await readFile(resiliencePath, "utf8");
	assert.match(metricsSource, /getMetricsSnapshot/);
	assert.match(requestContextSource, /x-request-id/);
	assert.match(resilienceSource, /withTimeout/);
	assert.match(resilienceSource, /retryAsync/);
});

test("phase 4 applies timeout and retry defaults to external calls", async () => {
	const emailSource = await readFile(emailServicePath, "utf8");
	const mediaSource = await readFile(mediaControllerPath, "utf8");
	assert.match(emailSource, /retryAsync/);
	assert.match(emailSource, /withTimeout/);
	assert.match(mediaSource, /withTimeout/);
});

test("phase 4 sets server timeout defaults", async () => {
	const serverSource = await readFile(serverPath, "utf8");
	assert.match(serverSource, /server\.requestTimeout/);
	assert.match(serverSource, /server\.headersTimeout/);
	assert.match(serverSource, /server\.keepAliveTimeout/);
});
