import { pathToFileURL } from "node:url";

import { writeReports } from "./lib/generateReport";
import {
  booleanArg,
  loadSeoConfig,
  loadTargets,
  parseArgs,
  stringArg,
  type SeoTarget,
} from "./config";

export type RenderedRouteCheck = {
  path: string;
  status: number;
  verdict: "PASS" | "WARNING" | "FAIL";
  issues: string[];
};

const publicSeoRoutes = loadTargets().map((target) => target.path);
const systemRoutes = ["/sitemap.xml", "/robots.txt"] as const;
const aiReadableRoutes = [
  "/llms.txt",
  ...publicSeoRoutes
    .map(markdownRouteForPublicPath)
    .filter((path): path is string => Boolean(path)),
];

const blockedVisibleCopy = [
  "public layer",
  "content layer",
  "SEO page",
  "app route",
  "feature page",
  "dynamic entity",
  "dynamic section",
  "location query",
  "query contract",
  "location taxonomy",
  "API-backed",
  "fallback renderer",
  "metadata helper",
  "JSON-LD helper",
  "structured data helper",
  "TODO",
  "Lorem ipsum",
  "placeholder",
  "developer",
];

const privatePathFragments = [
  "/admin",
  "/messages",
  "/settings",
  "/moderation",
  "/notifications",
  "/profile",
  "/sign-in",
  "/sign-up",
  "/explore/submissions",
  "/manage",
];

export async function runRenderedOutputVerification(
  argv = process.argv.slice(2),
): Promise<number> {
  const args = parseArgs(argv);
  const config = loadSeoConfig(args);
  const pathFilter = stringArg(args.path);
  const writeReport = booleanArg(args.report) || !pathFilter;
  const routes = pathFilter
    ? [pathFilter]
    : [...publicSeoRoutes, ...systemRoutes, ...aiReadableRoutes];
  const checks: RenderedRouteCheck[] = [];

  for (const routePath of routes) {
    if (routePath === "/sitemap.xml") {
      checks.push(await checkSitemap(config.targetBaseUrl));
      continue;
    }
    if (routePath === "/robots.txt") {
      checks.push(await checkRobots(config.targetBaseUrl));
      continue;
    }
    if (routePath === "/llms.txt") {
      checks.push(await checkTextRoute(routePath, config.targetBaseUrl, "text/plain"));
      continue;
    }
    if (routePath.endsWith(".md")) {
      checks.push(
        await checkTextRoute(routePath, config.targetBaseUrl, "text/markdown"),
      );
      continue;
    }
    checks.push(await checkHtmlRoute(routePath, config.targetBaseUrl));
  }

  const failing = checks.filter((check) => check.verdict === "FAIL");
  const warnings = checks.filter((check) => check.verdict === "WARNING");
  const passing = checks.filter((check) => check.verdict === "PASS");
  const summary = `${passing.length} passing, ${warnings.length} warning, ${failing.length} failing rendered routes.`;

  if (writeReport) {
    const report = writeReports({
      kind: "rendered-output",
      command: `seo:verify-rendered ${argv.join(" ")}`.trim(),
      provider: config.provider,
      targetBaseUrl: config.targetBaseUrl,
      cacheBehavior: "Rendered output verification fetches live HTML/XML/TXT from the configured local target.",
      summary,
      sections: checks.map((check) => ({
        title: `${check.path} - ${check.verdict}`,
        lines: [
          `Status: ${check.status}`,
          ...(check.issues.length > 0 ? check.issues : ["No issues detected."]),
        ],
      })),
      json: {
        summary,
        targetBaseUrl: config.targetBaseUrl,
        checks,
      },
    });
    console.log(`Markdown report: ${report.markdownPath}`);
    console.log(`JSON report: ${report.jsonPath}`);
  }

  console.log(summary);
  for (const check of checks) {
    if (check.verdict !== "PASS") {
      console.log(`${check.verdict}: ${check.path} - ${check.issues.join("; ")}`);
    }
  }

  return failing.length > 0 ? 1 : 0;
}

async function checkTextRoute(
  routePath: string,
  baseUrl: string,
  expectedContentType: "text/plain" | "text/markdown",
): Promise<RenderedRouteCheck> {
  const url = new URL(routePath, normalizeBaseUrl(baseUrl));
  const response = await fetch(url);
  const body = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const issues: string[] = [];

  if (response.status !== 200) issues.push(`Expected 200, got ${response.status}`);
  if (!contentType.toLowerCase().includes(expectedContentType)) {
    issues.push(`Expected ${expectedContentType}, got ${contentType || "missing"}`);
  }
  if (!body.includes("https://freediving.ph")) {
    issues.push("Missing production canonical or public URL reference");
  }
  if (body.includes("localhost") || body.includes("127.0.0.1")) {
    issues.push("Text route includes local URL");
  }
  for (const privatePath of privatePathFragments) {
    if (body.includes(`https://freediving.ph${privatePath}`) || body.includes(privatePath)) {
      issues.push(`Private route appears in text output: ${privatePath}`);
    }
  }
  for (const term of blockedVisibleCopy) {
    if (new RegExp(escapeRegExp(term), "i").test(body)) {
      issues.push(`Developer-facing copy detected: ${term}`);
    }
  }

  return verdict(routePath, response.status, issues);
}

export async function checkHtmlRoute(
  routePath: string,
  baseUrl: string,
): Promise<RenderedRouteCheck> {
  const url = new URL(routePath, normalizeBaseUrl(baseUrl));
  const response = await fetch(url);
  const html = await response.text();
  const issues: string[] = [];

  if (response.status !== 200) issues.push(`Expected 200, got ${response.status}`);

  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = metaByName(html, "description");
  const canonicalTags = findTags(
    html,
    "link",
    /\brel=["']canonical["']/i,
  );
  const canonical = canonicalTags[0] ? attrFromTag(canonicalTags[0], "href") : "";
  const h1 = [...html.matchAll(/<h1\b[^>]*>/gi)];
  const ogTitle = metaByProperty(html, "og:title");
  const ogDescription = metaByProperty(html, "og:description");
  const robots = metaByName(html, "robots");
  const jsonLdCount = [
    ...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/gi),
  ].length;
  const internalLinks = [
    ...new Set(
      [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
        .map((match) => decodeHtml(match[1] ?? ""))
        .filter((href) => href.startsWith("/") || href.startsWith("https://freediving.ph")),
    ),
  ];
  const visibleText = normalizeWhitespace(stripHtml(html));

  if (!title) issues.push("Missing title");
  if (!description) issues.push("Missing meta description");
  if (h1.length !== 1) issues.push(`Expected one H1, found ${h1.length}`);
  if (canonicalTags.length !== 1) issues.push(`Expected one canonical tag, found ${canonicalTags.length}`);
  if (canonical && !canonical.startsWith("https://freediving.ph")) {
    issues.push(`Canonical is not production: ${canonical}`);
  }
  if (canonical.includes("localhost") || canonical.includes("127.0.0.1")) {
    issues.push(`Canonical points to local URL: ${canonical}`);
  }
  if (canonical && canonical !== `https://freediving.ph${routePath}`) {
    issues.push(`Canonical mismatch: ${canonical}`);
  }
  if (!ogTitle || !ogDescription) issues.push("Open Graph title/description missing");
  if (jsonLdCount === 0) issues.push("Missing JSON-LD");
  if (robots.toLowerCase().includes("noindex")) {
    issues.push("Public route is marked noindex");
  }
  if (internalLinks.length === 0) issues.push("No internal links found");

  for (const term of blockedVisibleCopy) {
    if (new RegExp(escapeRegExp(term), "i").test(visibleText)) {
      issues.push(`Developer-facing visible copy detected: ${term}`);
    }
  }

  return {
    path: routePath,
    status: response.status,
    verdict: issues.some((issue) => !issue.startsWith("Open Graph")) ? "FAIL" : issues.length > 0 ? "WARNING" : "PASS",
    issues,
  };
}

async function checkSitemap(baseUrl: string): Promise<RenderedRouteCheck> {
  const response = await fetch(new URL("/sitemap.xml", normalizeBaseUrl(baseUrl)));
  const body = await response.text();
  const issues: string[] = [];
  if (response.status !== 200) issues.push(`Expected 200, got ${response.status}`);
  for (const routePath of publicSeoRoutes) {
    if (!body.includes(`https://freediving.ph${routePath}`)) {
      issues.push(`Missing public route: ${routePath}`);
    }
  }
  for (const privatePath of privatePathFragments) {
    if (body.includes(`https://freediving.ph${privatePath}`)) {
      issues.push(`Private route appears in sitemap: ${privatePath}`);
    }
  }
  return verdict("/sitemap.xml", response.status, issues);
}

async function checkRobots(baseUrl: string): Promise<RenderedRouteCheck> {
  const response = await fetch(new URL("/robots.txt", normalizeBaseUrl(baseUrl)));
  const body = await response.text();
  const issues: string[] = [];
  if (response.status !== 200) issues.push(`Expected 200, got ${response.status}`);
  if (!/sitemap:\s*https:\/\/freediving\.ph\/sitemap\.xml/i.test(body)) {
    issues.push("Robots.txt does not reference the production sitemap");
  }
  for (const routePath of ["/features", "/guides", "/freediving", "/about-us"]) {
    if (new RegExp(`disallow:\\s*${escapeRegExp(routePath)}\\b`, "i").test(body)) {
      issues.push(`Robots.txt blocks public SEO route: ${routePath}`);
    }
  }
  return verdict("/robots.txt", response.status, issues);
}

function verdict(
  path: string,
  status: number,
  issues: string[],
): RenderedRouteCheck {
  return {
    path,
    status,
    verdict: issues.length > 0 ? "FAIL" : "PASS",
    issues,
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function markdownRouteForPublicPath(routePath: string): string | null {
  if (
    routePath === "/features" ||
    routePath === "/guides" ||
    routePath === "/freediving" ||
    routePath === "/about-us" ||
    routePath.startsWith("/features/") ||
    routePath.startsWith("/guides/") ||
    routePath.startsWith("/freediving/")
  ) {
    return `${routePath}.md`;
  }
  return null;
}

function firstMatch(html: string, pattern: RegExp): string {
  return decodeHtml(pattern.exec(html)?.[1]?.trim() ?? "");
}

function metaByName(html: string, name: string): string {
  return attrFromTag(findTag(html, "meta", new RegExp(`\\bname=["']${escapeRegExp(name)}["']`, "i")), "content");
}

function metaByProperty(html: string, property: string): string {
  return attrFromTag(findTag(html, "meta", new RegExp(`\\bproperty=["']${escapeRegExp(property)}["']`, "i")), "content");
}

function findTag(html: string, tag: string, matcher: RegExp): string {
  return findTags(html, tag, matcher)[0] ?? "";
}

function findTags(html: string, tag: string, matcher: RegExp): string[] {
  const tags = html.match(new RegExp(`<${tag}\\b[^>]*>`, "gi")) ?? [];
  return tags.filter((candidate) => matcher.test(candidate));
}

function attrFromTag(tag: string, attr: string): string {
  const pattern = new RegExp(`\\b${attr}=["']([^"']*)["']`, "i");
  return decodeHtml(pattern.exec(tag)?.[1] ?? "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function normalizeWhitespace(value: string): string {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runRenderedOutputVerification()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
