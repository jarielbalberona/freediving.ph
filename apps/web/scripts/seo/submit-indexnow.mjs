#!/usr/bin/env node

const indexNowKey = "d56781b724a84cc8b1835fe68bf9ddb8";
const siteUrl = normalizeBaseUrl(
  process.env.INDEXNOW_SITE_URL || "https://freediving.ph",
);
const endpoint =
  process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";
const maxUrlsPerRequest = 10_000;

const usage = `
Usage:
  pnpm seo:indexnow -- --url /guides/freediving-safety-basics
  pnpm seo:indexnow -- --url / --url /features --dry-run
  pnpm seo:indexnow -- --from-sitemap

Options:
  --url <url>        Relative or absolute URL to submit. Repeatable.
  --urls <urls>      Comma-separated URLs to submit.
  --from-sitemap     Fetch production sitemap.xml and submit all listed URLs.
  --dry-run          Print the payload without sending it.
  --help             Show this help text.
`.trim();

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage);
    return;
  }

  const sitemapUrls = args.fromSitemap ? await fetchSitemapUrls() : [];
  const urlList = uniqueUrls([
    ...args.urls.flatMap((value) => value.split(",")),
    ...sitemapUrls,
  ]).map(normalizeSubmittedUrl);

  if (urlList.length === 0) {
    console.error("No URLs provided.");
    console.error(usage);
    process.exitCode = 1;
    return;
  }

  if (urlList.length > maxUrlsPerRequest) {
    console.error(
      `Refusing to submit ${urlList.length} URLs. IndexNow supports up to ${maxUrlsPerRequest} URLs per POST.`,
    );
    process.exitCode = 1;
    return;
  }

  const payload = {
    host: new URL(siteUrl).host,
    key: indexNowKey,
    keyLocation: new URL(`/${indexNowKey}.txt`, siteUrl).toString(),
    urlList,
  };

  if (args.dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`IndexNow submission failed: ${response.status}`);
    if (body.trim()) console.error(body.trim());
    process.exitCode = 1;
    return;
  }

  console.log(`IndexNow accepted ${urlList.length} URL(s).`);
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    fromSitemap: false,
    help: false,
    urls: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (arg === "--from-sitemap") {
      args.fromSitemap = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--url" || arg === "--urls") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error(`${arg} requires a value.`);
      }
      args.urls.push(value);
      index += 1;
      continue;
    }
    if (arg.startsWith("--url=")) {
      args.urls.push(arg.slice("--url=".length));
      continue;
    }
    if (arg.startsWith("--urls=")) {
      args.urls.push(arg.slice("--urls=".length));
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

async function fetchSitemapUrls() {
  const sitemapUrl = new URL("/sitemap.xml", siteUrl);
  const response = await fetch(sitemapUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${sitemapUrl}: ${response.status}`);
  }
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function normalizeSubmittedUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Empty URL provided.");
  }

  const url =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? new URL(trimmed)
      : new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, siteUrl);

  if (url.host !== new URL(siteUrl).host) {
    throw new Error(`URL does not belong to ${new URL(siteUrl).host}: ${url}`);
  }

  return url.toString();
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function uniqueUrls(values) {
  const seen = new Set();
  const urls = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    urls.push(trimmed);
  }
  return urls;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
