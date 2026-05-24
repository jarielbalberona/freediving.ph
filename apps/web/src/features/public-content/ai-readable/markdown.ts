import { siteConfig } from "@/config/site";

export type MarkdownLink = {
  label: string;
  href: string;
  description?: string;
};

export type MarkdownSection = {
  title: string;
  body?: string[];
  bullets?: string[];
  checklist?: string[];
  links?: MarkdownLink[];
};

export type MarkdownDocument = {
  title: string;
  description: string;
  canonicalPath: `/${string}`;
  sections: MarkdownSection[];
  links?: MarkdownLink[];
};

export const markdownContentType = "text/markdown; charset=utf-8";

export function markdownResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": markdownContentType,
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}

export function notFoundMarkdownResponse(): Response {
  return new Response("Not found\n", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function absolutePublicUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalizedPath}`;
}

export function toMarkdown(document: MarkdownDocument): string {
  const lines = [
    `# ${escapeMarkdownText(document.title)}`,
    "",
    `Canonical: ${absolutePublicUrl(document.canonicalPath)}`,
    "",
    document.description,
    "",
  ];

  for (const section of document.sections) {
    lines.push(`## ${escapeMarkdownText(section.title)}`, "");
    for (const paragraph of section.body ?? []) {
      lines.push(paragraph, "");
    }
    appendList(lines, section.bullets);
    appendChecklist(lines, section.checklist);
    appendLinks(lines, section.links, "Related links");
  }

  appendLinks(lines, document.links, "More on Freediving Philippines");

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

function appendList(lines: string[], items?: string[]) {
  if (!items?.length) return;
  for (const item of items) {
    lines.push(`- ${item}`);
  }
  lines.push("");
}

function appendChecklist(lines: string[], items?: string[]) {
  if (!items?.length) return;
  for (const item of items) {
    lines.push(`- ${item}`);
  }
  lines.push("");
}

function appendLinks(lines: string[], links?: MarkdownLink[], title?: string) {
  if (!links?.length) return;
  if (title) {
    lines.push(`## ${title}`, "");
  }
  for (const link of links) {
    const href = link.href.startsWith("http")
      ? link.href
      : absolutePublicUrl(link.href);
    const description = link.description ? ` - ${link.description}` : "";
    lines.push(`- [${escapeMarkdownText(link.label)}](${href})${description}`);
  }
  lines.push("");
}

function escapeMarkdownText(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+.!|-])/g, "\\$1");
}
