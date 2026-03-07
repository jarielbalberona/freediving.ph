import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(globalThis.process.cwd());

const metricsPath = path.join(repoRoot, "src/observability/metrics.ts");
const packageJsonPath = path.join(repoRoot, "package.json");
const releaseScriptPath = path.join(repoRoot, "scripts/release-explore-hardening.sh");

test("phase 8 adds explore route-level metrics and p95 reporting", async () => {
  const metricsSource = await readFile(metricsPath, "utf8");

  assert.match(metricsSource, /exploreRouteStats/);
  assert.match(metricsSource, /p95DurationMs/);
  assert.match(metricsSource, /events-by-dive-spot/);
  assert.match(metricsSource, /buddies-by-dive-spot/);
});

test("phase 8 exposes operational scripts for backfill/perf/metrics and flow checks", async () => {
  const packageSource = await readFile(packageJsonPath, "utf8");
  const releaseScript = await readFile(releaseScriptPath, "utf8");

  assert.match(packageSource, /"audit:explore-backfill"/);
  assert.match(packageSource, /"check:explore-metrics"/);
  assert.match(packageSource, /"verify:explore-performance"/);
  assert.match(packageSource, /"verify:explore-flow"/);

  assert.match(releaseScript, /verify-explore-flow\.sh/);
});
