import type {
  Device,
  KeywordVolumeResponse,
  SearchMarket,
  SeoProvider,
  SerpResponse,
  SerpResult,
} from "../config";

const provider: SeoProvider = "mock";

function domainFromUrl(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

export async function mockSerp(
  query: string,
  marketId: string,
  market: SearchMarket,
  limit: number,
): Promise<SerpResponse> {
  const normalizedQuery = query.toLowerCase();
  const targetPath = guessFreedivingPath(normalizedQuery);
  const results: SerpResult[] = [
    {
      position: 1,
      title: `Guide to ${query}`,
      url: "https://example-dive-school.ph/freediving-guide",
      domain: "example-dive-school.ph",
      snippet:
        "A local freediving school page covering lessons, safety, and beginner questions.",
    },
    {
      position: 2,
      title: "Freediving Philippines",
      url: `https://freediving.ph${targetPath}`,
      domain: "freediving.ph",
      snippet:
        "Community pages for freedivers in the Philippines, including guides, dive spots, buddies, events, groups, and schools.",
    },
    {
      position: 3,
      title: "Philippines Freediving Travel Notes",
      url: "https://travel-example.com/philippines-freediving",
      domain: "travel-example.com",
      snippet:
        "Traveler-focused notes about locations, seasons, and beginner-friendly freediving areas.",
    },
    {
      position: 4,
      title: "Local Freediving Community Discussion",
      url: "https://community-example.ph/freediving",
      domain: "community-example.ph",
      snippet:
        "Community thread with advice about schools, buddies, and conditions.",
    },
  ];

  return {
    provider,
    query,
    market: marketId,
    device: market.device as Device,
    results: results.slice(0, limit),
    fetchedAt: new Date("2026-05-24T00:00:00.000Z").toISOString(),
  };
}

export async function mockKeywordVolume(
  keywords: string[],
  marketId: string,
  market: SearchMarket,
): Promise<KeywordVolumeResponse> {
  return {
    provider,
    market: marketId,
    device: market.device,
    fetchedAt: new Date("2026-05-24T00:00:00.000Z").toISOString(),
    keywords: keywords.map((keyword, index) => ({
      keyword,
      searchVolume: 90 + index * 20,
      competition: index % 2 === 0 ? "LOW" : "MEDIUM",
      cpc: Number((0.12 + index * 0.03).toFixed(2)),
    })),
  };
}

export function guessFreedivingPath(query: string): `/${string}` {
  if (query.includes("safety")) return "/guides/freediving-safety-basics";
  if (query.includes("bring")) {
    return "/guides/what-to-bring-to-a-freediving-session";
  }
  if (query.includes("buddy")) return "/guides/how-to-find-a-freediving-buddy";
  if (query.includes("certification") || query.includes("course")) {
    return "/guides/freediving-certifications-philippines";
  }
  if (query.includes("time") || query.includes("season")) {
    return "/guides/best-time-to-freedive-in-the-philippines";
  }
  if (query.includes("spot") || query.includes("location")) {
    return "/features/dive-spots";
  }
  return "/guides/how-to-start-freediving-in-the-philippines";
}

export function isFreedivingDomain(url: string): boolean {
  return domainFromUrl(url) === "freediving.ph";
}
