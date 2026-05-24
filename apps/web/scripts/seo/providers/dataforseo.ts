import {
  requireDataForSeoCredentials,
  redactSecrets,
  type KeywordVolumeResponse,
  type SearchMarket,
  type SeoConfig,
  type SerpResponse,
  type SerpResult,
} from "../config";

const serpEndpoint =
  "https://api.dataforseo.com/v3/serp/google/organic/live/advanced";
const keywordEndpoint =
  "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live";

export async function dataForSeoSerp(
  config: SeoConfig,
  query: string,
  marketId: string,
  market: SearchMarket,
  limit: number,
): Promise<SerpResponse> {
  requireDataForSeoCredentials(config);
  const payload = [
    {
      keyword: query,
      location_code: market.location_code,
      language_code: market.language_code,
      device: market.device,
      depth: limit,
    },
  ];
  const response = await dataForSeoPost(config, serpEndpoint, payload);
  const task = response.tasks?.[0];
  const organicItems = (task?.result?.[0]?.items ?? []).filter(
    (item: DataForSeoSerpItem) => item.type === "organic",
  ) as DataForSeoSerpItem[];

  return {
    provider: "dataforseo",
    query,
    market: marketId,
    device: market.device,
    fetchedAt: new Date().toISOString(),
    results: organicItems.slice(0, limit).map((item, index) => {
      const url = item.url ?? "";
      return {
        position: item.rank_absolute ?? index + 1,
        title: item.title ?? "",
        url,
        domain: safeDomain(url),
        snippet: item.description ?? "",
      } satisfies SerpResult;
    }),
  };
}

export async function dataForSeoKeywordVolume(
  config: SeoConfig,
  keywords: string[],
  marketId: string,
  market: SearchMarket,
): Promise<KeywordVolumeResponse> {
  requireDataForSeoCredentials(config);
  const payload = [
    {
      keywords,
      location_code: market.location_code,
      language_code: market.language_code,
    },
  ];
  const response = await dataForSeoPost(config, keywordEndpoint, payload);
  const items = (response.tasks?.[0]?.result ?? []) as DataForSeoKeywordItem[];

  return {
    provider: "dataforseo",
    market: marketId,
    device: market.device,
    fetchedAt: new Date().toISOString(),
    keywords: items.map((item) => ({
      keyword: item.keyword,
      searchVolume: item.search_volume ?? null,
      competition: item.competition ?? null,
      cpc: item.cpc ?? null,
    })),
  };
}

async function dataForSeoPost(
  config: SeoConfig,
  url: string,
  payload: unknown,
): Promise<DataForSeoResponse> {
  const auth = Buffer.from(
    `${config.dataForSeoLogin}:${config.dataForSeoPassword}`,
  ).toString("base64");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let parsed: DataForSeoResponse;
  try {
    parsed = JSON.parse(text) as DataForSeoResponse;
  } catch {
    throw new Error(
      redactSecrets(`DataForSEO returned non-JSON response: ${text.slice(0, 300)}`),
    );
  }
  if (!response.ok || parsed.status_code >= 40000) {
    throw new Error(
      redactSecrets(
        `DataForSEO request failed: HTTP ${response.status}; ${parsed.status_message}`,
      ),
    );
  }
  return parsed;
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

type DataForSeoResponse = {
  status_code: number;
  status_message?: string;
  tasks?: Array<{
    result?: Array<{
      items?: DataForSeoSerpItem[];
      keyword?: string;
      search_volume?: number | null;
      competition?: string | null;
      cpc?: number | null;
    }>;
  }>;
};

type DataForSeoSerpItem = {
  type?: string;
  rank_absolute?: number;
  title?: string;
  url?: string;
  description?: string;
};

type DataForSeoKeywordItem = {
  keyword: string;
  search_volume?: number | null;
  competition?: string | null;
  cpc?: number | null;
};
