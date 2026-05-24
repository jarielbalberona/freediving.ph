import { pathToFileURL } from "node:url";

import { cacheFirst } from "./cache";
import { writeReports } from "./lib/generateReport";
import { dataForSeoKeywordVolume } from "./providers/dataforseo";
import { mockKeywordVolume } from "./providers/mock";
import {
  booleanArg,
  getSearchMarket,
  loadKeywordSeeds,
  loadPageKeywordMap,
  loadSeoConfig,
  parseArgs,
  requireDataForSeoCredentials,
  stringArg,
  type KeywordVolumeResponse,
  type SeoConfig,
} from "./config";

const softKeywordLimit = 20;
const hardKeywordLimit = 50;

export function assertKeywordPlanSafety({
  provider,
  keywordCount,
  confirmLive,
  allowOverLimit,
  cacheOnly,
  refresh = false,
}: {
  provider: string;
  keywordCount: number;
  confirmLive: boolean;
  allowOverLimit: boolean;
  cacheOnly: boolean;
  refresh?: boolean;
}): { dryRun: boolean } {
  if (provider !== "dataforseo") return { dryRun: false };
  if (keywordCount > hardKeywordLimit) {
    throw new Error(
      `Refusing live keyword plan for ${keywordCount} keywords; hard limit is ${hardKeywordLimit}.`,
    );
  }
  if (cacheOnly) return { dryRun: false };
  if (refresh && !confirmLive) {
    throw new Error("--refresh on DataForSEO requires --confirm-live.");
  }
  if (!confirmLive) return { dryRun: true };
  if (keywordCount > softKeywordLimit && !allowOverLimit) {
    throw new Error(
      `Live keyword plan over ${softKeywordLimit} keywords requires --allow-over-limit.`,
    );
  }
  return { dryRun: false };
}

export async function runKeywordPlan(
  argv = process.argv.slice(2),
): Promise<number> {
  const args = parseArgs(argv);
  const config = loadSeoConfig(args);
  const group = stringArg(args.group);
  if (!group) throw new Error("--group is required");
  const marketId = stringArg(args["search-market"]) ?? "ph";
  const market = getSearchMarket(marketId);
  const seeds = loadKeywordSeeds();
  const keywords = seeds[group];
  if (!keywords) throw new Error(`Unknown keyword group: ${group}`);
  const cacheOnly = booleanArg(args["cache-only"]);
  const refresh = booleanArg(args.refresh);
  const confirmLive = booleanArg(args["confirm-live"]);
  const allowOverLimit = booleanArg(args["allow-over-limit"]);
  const safety = assertKeywordPlanSafety({
    provider: config.provider,
    keywordCount: keywords.length,
    confirmLive,
    allowOverLimit,
    cacheOnly,
    refresh,
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
      `Paid DataForSEO keyword volume call confirmed for ${keywords.length} keyword(s) in ${marketId}.`,
    );
  }

  const { data, fromCache } = await fetchKeywordVolumes(config, keywords, group, marketId, market, {
    cacheOnly,
    refresh,
  });
  const pageKeywordMap = loadPageKeywordMap();
  const plan = data.keywords.map((item) => {
    const target = Object.entries(pageKeywordMap).find(
      ([, entry]) =>
        entry.primary === item.keyword || entry.secondary.includes(item.keyword),
    )?.[0];
    return {
      ...item,
      target: target ?? null,
      relevance: relevanceLabel(item.keyword),
      warning: target ? null : "No current page target maps to this keyword.",
    };
  });
  const summary = `${plan.length} keyword opportunities reviewed for ${group}.`;
  const report = writeReports({
    kind: "keyword-plan",
    command: `seo:keywords:plan ${argv.join(" ")}`.trim(),
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
    sections: plan.map((item) => ({
      title: item.keyword,
      lines: [
        `Search volume: ${item.searchVolume ?? "unavailable"}`,
        `Competition: ${item.competition ?? "unavailable"}`,
        `CPC: ${item.cpc ?? "unavailable"}`,
        `Suggested target: ${item.target ?? "[no current page]"}`,
        `Relevance: ${item.relevance}`,
        item.warning ? `Warning: ${item.warning}` : "Warning: none",
        `From cache: ${fromCache ? "yes" : "no"}`,
      ],
    })),
    json: {
      summary,
      provider: config.provider,
      searchMarket: marketId,
      fromCache,
      plan,
    },
  });

  console.log(summary);
  console.log(`Markdown report: ${report.markdownPath}`);
  console.log(`JSON report: ${report.jsonPath}`);
  return 0;
}

async function fetchKeywordVolumes(
  config: SeoConfig,
  keywords: string[],
  group: string,
  marketId: string,
  market: ReturnType<typeof getSearchMarket>,
  options: { cacheOnly: boolean; refresh: boolean },
): Promise<{ data: KeywordVolumeResponse; fromCache: boolean }> {
  return cacheFirst<KeywordVolumeResponse>(
    {
      provider: config.provider,
      requestType: "keyword-volume",
      query: group,
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
        ? mockKeywordVolume(keywords, marketId, market)
        : dataForSeoKeywordVolume(config, keywords, marketId, market),
  );
}

function relevanceLabel(keyword: string): string {
  if (/freediving/i.test(keyword) && /philippines|siquijor|dauin|apo|batangas|cebu|panglao/i.test(keyword)) {
    return "high";
  }
  if (/freediving/i.test(keyword)) return "medium";
  return "low";
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runKeywordPlan()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
