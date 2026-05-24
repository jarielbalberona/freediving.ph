import type { SerpResponse } from "../config";

export type SerpAnalysis = {
  query: string;
  targetPath: string;
  found: boolean;
  position: number | null;
  competingDomains: string[];
  titlePatterns: string[];
  snippetPatterns: string[];
  recommendations: string[];
};

export function analyzeSerp(
  response: SerpResponse,
  targetPath: string,
): SerpAnalysis {
  const targetUrl = `https://freediving.ph${targetPath}`;
  const match = response.results.find(
    (result) =>
      result.url === targetUrl ||
      result.url.startsWith(`${targetUrl}?`) ||
      result.url.startsWith(`${targetUrl}#`),
  );
  const competingDomains = [
    ...new Set(
      response.results
        .filter((result) => result.domain !== "freediving.ph")
        .map((result) => result.domain),
    ),
  ];
  const titlePatterns = response.results
    .map((result) => result.title)
    .filter(Boolean)
    .slice(0, 5);
  const snippetPatterns = response.results
    .map((result) => result.snippet)
    .filter(Boolean)
    .slice(0, 5);
  const recommendations: string[] = [];

  if (!match) {
    recommendations.push(
      "Freediving.ph was not found in the inspected result set; compare competitor intent before changing content.",
    );
  } else if (match.position > 5) {
    recommendations.push(
      "Freediving.ph appears outside the top 5; strengthen the page with clearer intent matching and internal links.",
    );
  } else {
    recommendations.push(
      "Freediving.ph appears in the inspected results; review competing titles and snippets for useful content gaps.",
    );
  }

  return {
    query: response.query,
    targetPath,
    found: Boolean(match),
    position: match?.position ?? null,
    competingDomains,
    titlePatterns,
    snippetPatterns,
    recommendations,
  };
}
