import type { LocalPageAnalysis } from "./analyzeLocalPage";

export type SeoPageScore = {
  score: number;
  verdict: "PASS" | "WARNING" | "FAIL";
  recommendations: string[];
  evidence: string[];
};

export function scoreSeoPage(page: LocalPageAnalysis): SeoPageScore {
  let score = 100;
  const recommendations: string[] = [];
  const evidence: string[] = [];

  for (const issue of page.severeIssues) {
    score -= 15;
    recommendations.push(issue);
  }
  for (const warning of page.warnings) {
    score -= 5;
    recommendations.push(warning);
  }

  if (page.internalLinks.length >= 8) score += 3;
  if (page.wordCount >= 650) score += 3;
  if (page.hasArticleJsonLd && page.target.type === "guide") score += 2;
  if (page.hasBreadcrumbJsonLd) score += 2;
  if (page.contentLength > 0 && /philippines|filipino|local|community/i.test(page.title + page.metaDescription)) {
    score += 2;
  }
  if (/safety|buddy|instructor|course|conditions/i.test(page.title + page.metaDescription)) {
    score += 2;
  }

  const boundedScore = Math.max(0, Math.min(100, score));
  const verdict =
    page.severeIssues.length > 0
      ? "FAIL"
      : boundedScore >= 85
        ? "PASS"
        : "WARNING";

  evidence.push(`Title: ${page.title || "[missing]"}`);
  evidence.push(`Meta description: ${page.metaDescription || "[missing]"}`);
  evidence.push(`Canonical: ${page.canonical || "[missing]"}`);
  evidence.push(`H1 count: ${page.h1.length}`);
  evidence.push(`Word count: ${page.wordCount}`);
  evidence.push(`Internal links: ${page.internalLinks.length}`);
  evidence.push(`JSON-LD types: ${page.jsonLdTypes.join(", ") || "[none]"}`);

  if (recommendations.length === 0) {
    recommendations.push("No urgent local SEO quality issues found.");
  }

  return {
    score: boundedScore,
    verdict,
    recommendations,
    evidence,
  };
}
