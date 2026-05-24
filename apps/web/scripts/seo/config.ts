import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type SeoProvider = "mock" | "dataforseo";
export type Device = "desktop" | "mobile";

export type SearchMarket = {
  label: string;
  location_code: number;
  language_code: string;
  country_iso_code: string;
  device: Device;
};

export type SeoTarget = {
  path: `/${string}`;
  type: string;
  primaryKeyword: string;
};

export type PageKeywordMapEntry = {
  primary: string;
  secondary: string[];
};

export type SerpResult = {
  position: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
};

export type SerpResponse = {
  provider: SeoProvider;
  query: string;
  market: string;
  device: Device;
  results: SerpResult[];
  fetchedAt: string;
  fromCache?: boolean;
};

export type KeywordVolume = {
  keyword: string;
  searchVolume: number | null;
  competition: string | null;
  cpc: number | null;
};

export type KeywordVolumeResponse = {
  provider: SeoProvider;
  market: string;
  device: Device;
  keywords: KeywordVolume[];
  fetchedAt: string;
  fromCache?: boolean;
};

export type SeoConfig = {
  provider: SeoProvider;
  targetBaseUrl: string;
  cacheTtlHours: number;
  maxResults: number;
  dataForSeoLogin: string;
  dataForSeoPassword: string;
};

export type CliArgs = Record<string, string | boolean>;

export const seoRoot = path.dirname(fileURLToPath(import.meta.url));
export const cacheDir = path.join(seoRoot, "cache");
export const reportsDir = path.join(seoRoot, "reports");

export function parseArgs(argv = process.argv.slice(2)): CliArgs {
  const args: CliArgs = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const next = argv[index + 1];
    if (inlineValue !== undefined) {
      args[rawKey] = inlineValue;
    } else if (next && !next.startsWith("--")) {
      args[rawKey] = next;
      index += 1;
    } else {
      args[rawKey] = true;
    }
  }
  return args;
}

export function loadSeoConfig(
  args: CliArgs = {},
  env: NodeJS.ProcessEnv = process.env,
): SeoConfig {
  const provider = parseProvider(
    stringArg(args.provider) ?? env.SEO_SERP_PROVIDER ?? "mock",
  );
  return {
    provider,
    targetBaseUrl:
      stringArg(args["target-base-url"]) ??
      env.SEO_TARGET_BASE_URL ??
      "http://localhost:3000",
    cacheTtlHours: parsePositiveInt(
      stringArg(args["cache-ttl-hours"]) ?? env.SEO_SERP_CACHE_TTL_HOURS,
      168,
    ),
    maxResults: parsePositiveInt(
      stringArg(args.limit) ?? env.SEO_SERP_MAX_RESULTS,
      10,
    ),
    dataForSeoLogin: env.DATAFORSEO_LOGIN ?? "",
    dataForSeoPassword: env.DATAFORSEO_PASSWORD ?? "",
  };
}

export function parseProvider(value: string): SeoProvider {
  if (value === "mock" || value === "dataforseo") return value;
  throw new Error(`Unsupported SEO provider: ${value}`);
}

export function requireDataForSeoCredentials(config: SeoConfig): void {
  if (config.provider !== "dataforseo") return;
  if (!config.dataForSeoLogin || !config.dataForSeoPassword) {
    throw new Error(
      "DataForSEO credentials are required for confirmed live DataForSEO requests.",
    );
  }
}

export function redactSecrets(input: string): string {
  return input
    .replaceAll(process.env.DATAFORSEO_LOGIN ?? "__NO_LOGIN__", "[redacted]")
    .replaceAll(
      process.env.DATAFORSEO_PASSWORD ?? "__NO_PASSWORD__",
      "[redacted]",
    )
    .replace(/Basic\s+[A-Za-z0-9+/=._-]+/g, "Basic [redacted]");
}

export function loadJsonFile<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(path.join(seoRoot, relativePath), "utf8"),
  ) as T;
}

export function loadTargets(): SeoTarget[] {
  return loadJsonFile<SeoTarget[]>("seo-targets.json");
}

export function loadPageKeywordMap(): Record<string, PageKeywordMapEntry> {
  return loadJsonFile<Record<string, PageKeywordMapEntry>>(
    "config/page-keyword-map.json",
  );
}

export function loadKeywordSeeds(): Record<string, string[]> {
  return loadJsonFile<Record<string, string[]>>("config/keyword-seeds.ph.json");
}

export function loadSearchMarkets(): Record<string, SearchMarket> {
  const markets = loadJsonFile<Record<string, SearchMarket>>(
    "config/search-markets.json",
  );
  for (const [marketId, market] of Object.entries(markets)) {
    validateSearchMarket(marketId, market);
  }
  return markets;
}

export function getSearchMarket(marketId = "ph"): SearchMarket {
  const markets = loadSearchMarkets();
  const market = markets[marketId];
  if (!market) {
    throw new Error(`Unknown search market: ${marketId}`);
  }
  return market;
}

export function validateSearchMarket(
  marketId: string,
  market: Partial<SearchMarket>,
): asserts market is SearchMarket {
  if (!market.location_code || !Number.isInteger(market.location_code)) {
    throw new Error(`Search market ${marketId} is missing location_code`);
  }
  if (!market.language_code) {
    throw new Error(`Search market ${marketId} is missing language_code`);
  }
  if (!market.country_iso_code) {
    throw new Error(`Search market ${marketId} is missing country_iso_code`);
  }
  if (market.device !== "desktop" && market.device !== "mobile") {
    throw new Error(`Search market ${marketId} has invalid device`);
  }
}

export function stringArg(value: string | boolean | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function booleanArg(value: string | boolean | undefined): boolean {
  return value === true || value === "true" || value === "1" || value === "yes";
}

function parsePositiveInt(value: string | undefined | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
