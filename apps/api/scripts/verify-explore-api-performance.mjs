import process from "node:process";

const baseUrl = process.env.API_BASE_URL || "http://localhost:8080";
const iterations = Number(process.env.PERF_ITERATIONS || 80);
const concurrency = Number(process.env.PERF_CONCURRENCY || 10);
const spotId = Number(process.env.SPOT_ID || 1);
const authToken = process.env.AUTH_TOKEN || "";

const targets = [
  {
    id: "dive-spots.map",
    path: `/dive-spots?shape=map&limit=100&offset=0&north=14&south=5&east=126&west=118`,
  },
  {
    id: "dive-spots.summary",
    path: `/dive-spots/${spotId}/reviews/summary`,
  },
  {
    id: "events.by-spot",
    path: `/events?diveSpotId=${spotId}&limit=20&offset=0`,
  },
  {
    id: "records.by-spot",
    path: `/records?diveSpotId=${spotId}&limit=20&offset=0`,
  },
  {
    id: "buddies.by-spot",
    path: `/buddies/available?diveSpotId=${spotId}&limit=20&offset=0`,
    authRequired: true,
  },
].filter((target) => !target.authRequired || authToken);

if (targets.length === 0) {
  console.error("[perf] no targets selected");
  process.exit(1);
}

const percentile = (values, p) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(index, 0)] ?? 0;
};

const runTarget = async (target) => {
  const latencies = [];
  let errors = 0;

  let completed = 0;
  const runOne = async () => {
    while (completed < iterations) {
      const current = completed;
      completed += 1;
      if (current >= iterations) return;

      const started = performance.now();
      try {
        const response = await fetch(`${baseUrl}${target.path}`, {
          headers: target.authRequired ? { Authorization: `Bearer ${authToken}` } : undefined,
        });
        if (!response.ok) {
          errors += 1;
          continue;
        }
        await response.arrayBuffer();
      } catch {
        errors += 1;
        continue;
      } finally {
        latencies.push(performance.now() - started);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => runOne()));

  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const avg = latencies.length ? latencies.reduce((sum, v) => sum + v, 0) / latencies.length : 0;

  return {
    id: target.id,
    samples: latencies.length,
    errors,
    errorRate: latencies.length ? errors / latencies.length : 0,
    avg,
    p50,
    p95,
  };
};

console.log(`[perf] baseUrl=${baseUrl} iterations=${iterations} concurrency=${concurrency}`);
for (const target of targets) {
  const result = await runTarget(target);
  console.log(
    `[perf] ${result.id} samples=${result.samples} errors=${result.errors} errorRate=${result.errorRate.toFixed(4)} avg=${result.avg.toFixed(2)}ms p50=${result.p50.toFixed(2)}ms p95=${result.p95.toFixed(2)}ms`,
  );
}
