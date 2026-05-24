import { pathToFileURL } from "node:url";

import { analyzeLocalPage } from "./lib/analyzeLocalPage";
import { writeReports } from "./lib/generateReport";
import { scoreSeoPage } from "./lib/scoreSeoPage";
import {
  booleanArg,
  loadSeoConfig,
  loadTargets,
  parseArgs,
  stringArg,
  type SeoTarget,
} from "./config";

export async function runAudit(argv = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);
  const config = loadSeoConfig(args);
  const pathFilter = stringArg(args.path);
  const analyzeAll = booleanArg(args.all) || !pathFilter;
  const targets = selectTargets(loadTargets(), pathFilter, analyzeAll);
  const analyses = [];

  for (const target of targets) {
    const analysis = await analyzeLocalPage(target, config.targetBaseUrl);
    const score = scoreSeoPage(analysis);
    analyses.push({ analysis, score });
  }

  const failing = analyses.filter((entry) => entry.score.verdict === "FAIL");
  const warning = analyses.filter((entry) => entry.score.verdict === "WARNING");
  const passing = analyses.filter((entry) => entry.score.verdict === "PASS");
  const summary = `${passing.length} passing, ${warning.length} warning, ${failing.length} failing pages.`;
  const sections = analyses.map(({ analysis, score }) => ({
    title: `${analysis.target.path} - ${score.verdict} (${score.score})`,
    lines: [
      `Keyword: ${analysis.target.primaryKeyword}`,
      `Status: ${analysis.statusCode}`,
      `Title: ${analysis.title || "[missing]"}`,
      `Meta: ${analysis.metaDescription || "[missing]"}`,
      `Canonical: ${analysis.canonical || "[missing]"}`,
      `Word count: ${analysis.wordCount}`,
      `Internal links: ${analysis.internalLinks.length}`,
      `JSON-LD types: ${analysis.jsonLdTypes.join(", ") || "[none]"}`,
      ...score.recommendations.map((item) => `Recommendation: ${item}`),
    ],
  }));

  const report = writeReports({
    kind: "audit",
    command: `seo:audit ${argv.join(" ")}`.trim(),
    provider: config.provider,
    targetBaseUrl: config.targetBaseUrl,
    cacheBehavior: "Local page fetches are live against the configured local target; SERP provider is not called by audit.",
    summary,
    sections,
    json: {
      summary,
      provider: config.provider,
      targetBaseUrl: config.targetBaseUrl,
      pages: analyses,
    },
  });

  console.log(summary);
  console.log(`Markdown report: ${report.markdownPath}`);
  console.log(`JSON report: ${report.jsonPath}`);
  return failing.length > 0 ? 1 : 0;
}

function selectTargets(
  targets: SeoTarget[],
  pathFilter: string | null,
  analyzeAll: boolean,
): SeoTarget[] {
  if (analyzeAll) return targets;
  const target = targets.find((candidate) => candidate.path === pathFilter);
  if (!target) throw new Error(`No SEO target configured for ${pathFilter}`);
  return [target];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runAudit()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
