import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  loadSeoConfig,
  loadTargets,
  parseArgs,
  seoRoot,
  stringArg,
} from "./config";
import { writeReports } from "./lib/generateReport";

export type GscCoverageRow = Record<string, string>;

export type GscCoverageSummary = {
  totalRows: number;
  categories: Record<string, number>;
  publicSeoProblems: Array<{ url: string; status: string }>;
  privateRouteAppearances: Array<{ url: string; status: string }>;
  missingPublicTargets: string[];
};

const privateRouteFragments = [
  "/admin",
  "/messages",
  "/settings",
  "/moderation",
  "/notifications",
  "/profile",
  "/sign-in",
  "/sign-up",
  "/manage",
  "/my/",
  "/explore/submissions",
];

const problemStatuses = [
  "crawled - currently not indexed",
  "discovered - currently not indexed",
  "duplicate",
  "not found",
  "404",
  "excluded by noindex",
  "blocked by robots",
  "soft 404",
  "server error",
];

export async function runGscCoverage(argv = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);
  const config = loadSeoConfig(args);
  const inputPath = stringArg(args.file) ?? latestCsvPath();
  if (!inputPath) {
    throw new Error(
      "No GSC CSV found. Pass --file scripts/seo/gsc/export.csv or place a CSV under scripts/seo/gsc/.",
    );
  }

  const rows = parseCsv(readFileSync(inputPath, "utf8"));
  const summary = summarizeCoverage(rows);
  const report = writeReports({
    kind: "gsc-coverage",
    command: `seo:gsc:coverage ${argv.join(" ")}`.trim(),
    provider: config.provider,
    cacheBehavior: "Local CSV import only. No Search Console API calls are made.",
    summary: `${summary.totalRows} rows, ${summary.publicSeoProblems.length} public SEO issues, ${summary.privateRouteAppearances.length} private-route appearances.`,
    sections: [
      {
        title: "Issue Categories",
        lines:
          Object.entries(summary.categories).length > 0
            ? Object.entries(summary.categories).map(
            ([status, count]) => `${status}: ${count}`,
              )
            : ["No rows found."],
      },
      {
        title: "Public SEO Problems",
        lines:
          summary.publicSeoProblems.length > 0
            ? summary.publicSeoProblems.map(
                (item) => `${item.url} - ${item.status}`,
              )
            : ["No public SEO problems detected."],
      },
      {
        title: "Private Route Appearances",
        lines:
          summary.privateRouteAppearances.length > 0
            ? summary.privateRouteAppearances.map(
                (item) => `${item.url} - ${item.status}`,
              )
            : ["No private routes detected in the export."],
      },
      {
        title: "Missing Public Targets",
        lines:
          summary.missingPublicTargets.length > 0
            ? summary.missingPublicTargets
            : ["No configured public targets are missing from the export."],
      },
    ],
    json: {
      inputPath,
      summary,
    },
  });

  console.log(`GSC coverage rows: ${summary.totalRows}`);
  console.log(`Public SEO issues: ${summary.publicSeoProblems.length}`);
  console.log(`Private route appearances: ${summary.privateRouteAppearances.length}`);
  console.log(`Markdown report: ${report.markdownPath}`);
  console.log(`JSON report: ${report.jsonPath}`);
  return 0;
}

export function summarizeCoverage(rows: GscCoverageRow[]): GscCoverageSummary {
  const publicTargets = loadTargets().map(
    (target) => `https://freediving.ph${target.path}`,
  );
  const seenUrls = new Set<string>();
  const categories: Record<string, number> = {};
  const publicSeoProblems: Array<{ url: string; status: string }> = [];
  const privateRouteAppearances: Array<{ url: string; status: string }> = [];

  for (const row of rows) {
    const url = rowValue(row, ["url", "page", "address", "page url"]);
    const status = rowValue(row, [
      "status",
      "reason",
      "coverage",
      "indexing state",
      "page indexing",
    ]);
    if (!url) continue;
    seenUrls.add(normalizeUrl(url));
    const normalizedStatus = status || "Unknown";
    categories[normalizedStatus] = (categories[normalizedStatus] ?? 0) + 1;

    if (isPrivateRoute(url)) {
      privateRouteAppearances.push({ url, status: normalizedStatus });
    }
    if (isPublicSeoTarget(url) && isProblemStatus(normalizedStatus)) {
      publicSeoProblems.push({ url, status: normalizedStatus });
    }
  }

  return {
    totalRows: rows.length,
    categories,
    publicSeoProblems,
    privateRouteAppearances,
    missingPublicTargets: publicTargets.filter(
      (target) => !seenUrls.has(normalizeUrl(target)),
    ),
  };
}

export function parseCsv(source: string): GscCoverageRow[] {
  const rows = parseCsvRows(source);
  const [header = [], ...records] = rows;
  const normalizedHeader = header.map((name) => name.trim());
  return records
    .filter((record) => record.some((value) => value.trim().length > 0))
    .map((record) =>
      Object.fromEntries(
        normalizedHeader.map((name, index) => [name, record[index]?.trim() ?? ""]),
      ),
    );
}

function parseCsvRows(source: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      row.push(field);
      field = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
      continue;
    }
    field += char;
  }
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function latestCsvPath(): string | null {
  const dir = path.join(seoRoot, "gsc");
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith(".csv"))
    .sort()
    .reverse();
  return files[0] ? path.join(dir, files[0]) : null;
}

function rowValue(row: GscCoverageRow, names: string[]): string {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.toLowerCase().trim(), value]),
  );
  for (const name of names) {
    const value = normalized[name.toLowerCase()];
    if (value) return value.trim();
  }
  return "";
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function isPublicSeoTarget(url: string): boolean {
  return loadTargets().some((target) =>
    routeMatches(normalizeUrl(url), `https://freediving.ph${target.path}`),
  );
}

function routeMatches(url: string, target: string): boolean {
  return url === target || url.startsWith(`${target}/`);
}

function isProblemStatus(status: string): boolean {
  const lower = status.toLowerCase();
  return problemStatuses.some((problem) => lower.includes(problem));
}

function isPrivateRoute(url: string): boolean {
  return privateRouteFragments.some((fragment) => url.includes(fragment));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runGscCoverage()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
