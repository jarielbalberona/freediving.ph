import { pathToFileURL } from "node:url";

import { cacheFirst } from "./cache";
import { analyzeSerp } from "./lib/analyzeSerp";
import { writeReports } from "./lib/generateReport";
import { dataForSeoSerp } from "./providers/dataforseo";
import { mockSerp } from "./providers/mock";
import {
  booleanArg,
  getSearchMarket,
  loadPageKeywordMap,
  loadSeoConfig,
  loadTargets,
  parseArgs,
  requireDataForSeoCredentials,
  stringArg,
  type SeoConfig,
  type SeoTarget,
  type SerpResponse,
} from "./config";

const softLiveKeywordLimit = 5;
const hardLiveKeywordLimit = 10;

export type LiveSafetyInput = {
  provider: string;
  keywordCount: number;
  confirmLive: boolean;
  allowOverLimit: boolean;
  refresh: boolean;
  cacheOnly: boolean;
};

export function assertSerpLiveSafety(input: LiveSafetyInput): {
  dryRun: boolean;
} {
  if (input.provider !== "dataforseo") return { dryRun: false };
  if (input.keywordCount > hardLiveKeywordLimit) {
    throw new Error(
      `Refusing live DataForSEO SERP run for ${input.keywordCount} keywords; hard limit is ${hardLiveKeywordLimit}.`,
    );
  }
  if (input.cacheOnly) return { dryRun: false };
  if (input.refresh && !input.confirmLive) {
    throw new Error("--refresh on DataForSEO requires --confirm-live.");
  }
  if (!input.confirmLive) return { dryRun: true };
  if (input.keywordCount > softLiveKeywordLimit && !input.allowOverLimit) {
    throw new Error(
      `Live DataForSEO SERP run over ${softLiveKeywordLimit} keywords requires --allow-over-limit.`,
    );
  }
  return { dryRun: false };
}

export async function runSerpRank(
  argv = process.argv.slice(2),
): Promise<number> {
  const args = parseArgs(argv);
  const config = loadSeoConfig(args);
  const marketId = stringArg(args["search-market"]) ?? "ph";
  const market = getSearchMarket(marketId);
  const cacheOnly = booleanArg(args["cache-only"]);
  const refresh = booleanArg(args.refresh);
  const confirmLive = booleanArg(args["confirm-live"]);
  const allowOverLimit = booleanArg(args["allow-over-limit"]);
  const keywordLimit = Math.min(config.maxResults, loadTargets().length);
  const targets = loadTargets().slice(0, keywordLimit);
  const safety = assertSerpLiveSafety({
    provider: config.provider,
    keywordCount: targets.length,
    confirmLive,
    allowOverLimit,
    refresh,
    cacheOnly,
  });

  if (config.provider === "dataforseo" && safety.dryRun) {
    console.log(
      "Dry run only: DataForSEO selected without --confirm-live. Use --cache-only for cached data or --confirm-live for paid live calls.",
    );
    return 0;
  }
  if (config.provider === "dataforseo" && confirmLive) {
    requireDataForSeoCredentials(config);
    console.log(
      `Paid DataForSEO SERP call confirmed for ${targets.length} keyword(s) in ${marketId}.`,
    );
  }

  const responses = [];
  for (const target of targets) {
    responses.push(
      await fetchSerp(config, target, marketId, market, {
        cacheOnly,
        refresh,
      }),
    );
  }

  const analyses = responses.map(({ target, response }) => ({
    target,
    response,
    analysis: analyzeSerp(response, target.path),
  }));
  const summary = `${analyses.length} keyword SERP checks completed with provider ${config.provider}.`;
  const report = writeReports({
    kind: "serp-rank",
    command: `seo:serp:rank ${argv.join(" ")}`.trim(),
    provider: config.provider,
    searchMarket: marketId,
    cacheBehavior: cacheOnly
      ? "cache-only"
      : refresh
        ? "refresh requested"
        : "cache-first",
    paidWarning:
      config.provider === "dataforseo"
        ? "DataForSEO can spend credits only when --confirm-live is present and cache is missed or refreshed."
        : undefined,
    summary,
    sections: analyses.map(({ target, analysis, response }) => ({
      title: `${target.primaryKeyword} -> ${target.path}`,
      lines: [
        `Found freediving.ph: ${analysis.found ? "yes" : "no"}`,
        `Position: ${analysis.position ?? "not found"}`,
        `From cache: ${response.fromCache ? "yes" : "no"}`,
        `Competing domains: ${analysis.competingDomains.join(", ") || "[none]"}`,
        `Top title patterns: ${analysis.titlePatterns.join(" | ") || "[none]"}`,
        ...analysis.recommendations.map((item) => `Recommendation: ${item}`),
      ],
    })),
    json: { summary, provider: config.provider, searchMarket: marketId, analyses },
  });

  console.log(summary);
  console.log(`Markdown report: ${report.markdownPath}`);
  console.log(`JSON report: ${report.jsonPath}`);
  return 0;
}

async function fetchSerp(
  config: SeoConfig,
  target: SeoTarget,
  marketId: string,
  market: ReturnType<typeof getSearchMarket>,
  options: { cacheOnly: boolean; refresh: boolean },
): Promise<{ target: SeoTarget; response: SerpResponse }> {
  const { data, fromCache } = await cacheFirst<SerpResponse>(
    {
      provider: config.provider,
      requestType: "serp",
      query: target.primaryKeyword,
      market: marketId,
      device: market.device,
    },
    {
      ttlHours: config.cacheTtlHours,
      refresh: options.refresh,
      cacheOnly: options.cacheOnly,
    },
    () =>
      config.provider === "mock"
        ? mockSerp(target.primaryKeyword, marketId, market, config.maxResults)
        : dataForSeoSerp(
            config,
            target.primaryKeyword,
            marketId,
            market,
            config.maxResults,
          ),
  );
  return { target, response: { ...data, fromCache } };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runSerpRank()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}

void loadPageKeywordMap;
