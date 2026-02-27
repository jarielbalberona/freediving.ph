import process from "node:process";

const baseUrl = process.env.API_BASE_URL || "http://localhost:8080";
const p95Threshold = Number(process.env.EXPLORE_P95_THRESHOLD_MS || 800);
const errorRateThreshold = Number(process.env.EXPLORE_ERROR_RATE_THRESHOLD || 0.02);

const response = await fetch(`${baseUrl}/metrics`);
if (!response.ok) {
  console.error(`[metrics-check] failed to fetch /metrics: HTTP ${response.status}`);
  process.exit(1);
}

const payload = await response.json();
const explore = payload?.explore;
if (!explore) {
  console.error("[metrics-check] explore metrics are missing from payload");
  process.exit(1);
}

const errorRate = explore.totalRequests > 0 ? explore.totalErrors / explore.totalRequests : 0;

console.log(`[metrics-check] explore.totalRequests=${explore.totalRequests}`);
console.log(`[metrics-check] explore.totalErrors=${explore.totalErrors}`);
console.log(`[metrics-check] explore.p95DurationMs=${explore.p95DurationMs}`);
console.log(`[metrics-check] explore.errorRate=${errorRate.toFixed(4)}`);

let hasViolation = false;
if (explore.p95DurationMs > p95Threshold) {
  console.error(
    `[metrics-check] p95 duration violation: ${explore.p95DurationMs}ms > ${p95Threshold}ms threshold`,
  );
  hasViolation = true;
}

if (errorRate > errorRateThreshold) {
  console.error(
    `[metrics-check] error rate violation: ${errorRate.toFixed(4)} > ${errorRateThreshold.toFixed(4)} threshold`,
  );
  hasViolation = true;
}

if (hasViolation) {
  process.exit(1);
}

console.log("[metrics-check] OK");
