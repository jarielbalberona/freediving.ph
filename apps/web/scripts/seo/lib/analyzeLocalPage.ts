import { loadJsonFile, type SeoTarget } from "../config";

export type Heading = {
  level: number;
  text: string;
};

export type LocalPageAnalysis = {
  target: SeoTarget;
  statusCode: number;
  finalUrl: string;
  expectedCanonical: string;
  title: string;
  metaDescription: string;
  canonical: string;
  robots: string;
  h1: string[];
  headings: Heading[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  jsonLdCount: number;
  jsonLdTypes: string[];
  hasArticleJsonLd: boolean;
  hasBreadcrumbJsonLd: boolean;
  internalLinks: string[];
  outboundLinks: string[];
  imageCount: number;
  imagesMissingAlt: number;
  wordCount: number;
  contentLength: number;
  warnings: string[];
  severeIssues: string[];
};

const developerCopyTerms = [
  "TODO",
  "Lorem ipsum",
  "developer",
  "route",
  "component",
  "placeholder",
  "coming soon",
  "SEO page",
  "metadata helper",
  "JSON-LD helper",
];

export async function analyzeLocalPage(
  target: SeoTarget,
  baseUrl: string,
): Promise<LocalPageAnalysis> {
  const url = new URL(target.path, normalizeBaseUrl(baseUrl));
  const response = await fetch(url);
  const html = await response.text();
  const finalUrl = response.url;
  const text = normalizeWhitespace(stripHtml(html));
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = metaByName(html, "description");
  const canonical = linkRel(html, "canonical");
  const robots = metaByName(html, "robots");
  const h1 = extractHeadings(html, 1).map((heading) => heading.text);
  const headings = [1, 2, 3].flatMap((level) => extractHeadings(html, level));
  const ogTitle = metaByProperty(html, "og:title");
  const ogDescription = metaByProperty(html, "og:description");
  const ogImage = metaByProperty(html, "og:image");
  const jsonLdTypes = extractJsonLdTypes(html);
  const links = extractLinks(html);
  const internalLinks = [...new Set(links.filter(isInternalLink))];
  const outboundLinks = [...new Set(links.filter(isOutboundLink))];
  const imageTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const warnings: string[] = [];
  const severeIssues: string[] = [];
  const expectedCanonical = `https://freediving.ph${target.path}`;

  if (!response.ok) severeIssues.push(`Page unreachable: ${response.status}`);
  if (!title) severeIssues.push("Missing title");
  if (!metaDescription) severeIssues.push("Missing meta description");
  if (h1.length === 0) severeIssues.push("Missing H1");
  if (robots.toLowerCase().includes("noindex")) {
    severeIssues.push("Public page is marked noindex");
  }
  if (canonical !== expectedCanonical) {
    severeIssues.push(`Canonical mismatch: expected ${expectedCanonical}`);
  }

  if (h1.length > 1) warnings.push(`Multiple H1 tags found: ${h1.length}`);
  if (title && title.length < 20) warnings.push("Title may be too short");
  if (title.length > 70) warnings.push("Title may be too long");
  if (metaDescription && metaDescription.length < 70) {
    warnings.push("Meta description may be too short");
  }
  if (metaDescription.length > 170) {
    warnings.push("Meta description may be too long");
  }
  if (!ogTitle || !ogDescription || !ogImage) {
    warnings.push("Open Graph metadata is incomplete");
  }
  if (jsonLdTypes.length === 0) warnings.push("No JSON-LD detected");
  if (target.type === "guide" && !jsonLdTypes.includes("Article")) {
    warnings.push("Guide page does not expose Article JSON-LD");
  }
  if (!jsonLdTypes.includes("BreadcrumbList")) {
    warnings.push("Breadcrumb JSON-LD not detected");
  }
  if (internalLinks.length < 5) warnings.push("Few internal links detected");
  if (wordCount(text) < 250) warnings.push("Thin content warning");
  if (imageTags.length > 0 && missingAltCount(imageTags) > 0) {
    warnings.push("Some images are missing alt text");
  }

  for (const term of developerCopyTerms) {
    if (new RegExp(escapeRegExp(term), "i").test(text)) {
      severeIssues.push(`Developer or placeholder copy detected: ${term}`);
    }
  }

  const countryRules = loadJsonFile<{ leakageTerms: string[] }>(
    "config/country-page-rules.json",
  );
  for (const term of countryRules.leakageTerms) {
    if (new RegExp(escapeRegExp(term), "i").test(text)) {
      warnings.push(`Copied-project leakage term detected: ${term}`);
    }
  }

  return {
    target,
    statusCode: response.status,
    finalUrl,
    expectedCanonical,
    title: decodeHtml(title),
    metaDescription: decodeHtml(metaDescription),
    canonical,
    robots,
    h1: h1.map(decodeHtml),
    headings,
    ogTitle: decodeHtml(ogTitle),
    ogDescription: decodeHtml(ogDescription),
    ogImage,
    jsonLdCount: jsonLdTypes.length,
    jsonLdTypes,
    hasArticleJsonLd: jsonLdTypes.includes("Article"),
    hasBreadcrumbJsonLd: jsonLdTypes.includes("BreadcrumbList"),
    internalLinks,
    outboundLinks,
    imageCount: imageTags.length,
    imagesMissingAlt: missingAltCount(imageTags),
    wordCount: wordCount(text),
    contentLength: text.length,
    warnings,
    severeIssues,
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function firstMatch(html: string, pattern: RegExp): string {
  return decodeHtml(pattern.exec(html)?.[1]?.trim() ?? "");
}

function metaByName(html: string, name: string): string {
  return attrFromTag(
    findTag(html, "meta", new RegExp(`\\bname=["']${escapeRegExp(name)}["']`, "i")),
    "content",
  );
}

function metaByProperty(html: string, property: string): string {
  return attrFromTag(
    findTag(
      html,
      "meta",
      new RegExp(`\\bproperty=["']${escapeRegExp(property)}["']`, "i"),
    ),
    "content",
  );
}

function linkRel(html: string, rel: string): string {
  return attrFromTag(
    findTag(html, "link", new RegExp(`\\brel=["']${escapeRegExp(rel)}["']`, "i")),
    "href",
  );
}

function findTag(html: string, tag: string, matcher: RegExp): string {
  const tags = html.match(new RegExp(`<${tag}\\b[^>]*>`, "gi")) ?? [];
  return tags.find((candidate) => matcher.test(candidate)) ?? "";
}

function attrFromTag(tag: string, attr: string): string {
  const pattern = new RegExp(`\\b${attr}=["']([^"']*)["']`, "i");
  return decodeHtml(pattern.exec(tag)?.[1] ?? "");
}

function extractHeadings(html: string, level: number): Heading[] {
  return [...html.matchAll(new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi"))].map(
    (match) => ({
      level,
      text: decodeHtml(normalizeWhitespace(stripHtml(match[1] ?? ""))),
    }),
  );
}

function extractJsonLdTypes(html: string): string[] {
  const scripts = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  const types: string[] = [];
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[1] ?? "") as unknown;
      collectJsonLdTypes(parsed, types);
    } catch {
      types.push("InvalidJsonLd");
    }
  }
  return [...new Set(types)];
}

function collectJsonLdTypes(value: unknown, types: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdTypes(item, types);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record["@type"] === "string") types.push(record["@type"]);
  for (const nested of Object.values(record)) collectJsonLdTypes(nested, types);
}

function extractLinks(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => decodeHtml(match[1] ?? ""))
    .filter((href) => href && !href.startsWith("#") && !href.startsWith("mailto:"));
}

function isInternalLink(href: string): boolean {
  return href.startsWith("/") || href.startsWith("https://freediving.ph");
}

function isOutboundLink(href: string): boolean {
  return href.startsWith("http") && !href.startsWith("https://freediving.ph");
}

function missingAltCount(imageTags: string[]): number {
  return imageTags.filter((tag) => !/\balt=["'][^"']*["']/i.test(tag)).length;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function wordCount(text: string): number {
  return (text.match(/\b[\w'-]+\b/g) ?? []).length;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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
