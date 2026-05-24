import { siteConfig } from "@/config/site";

import { absolutePublicUrl } from "./markdown";
import { aiReadableEntries } from "./registry";

const sectionOrder = [
  "Features",
  "Guides",
  "Freediving locations",
  "About",
] as const;

export function buildLlmsTxt(): string {
  const lines = [
    "# Freediving Philippines",
    "",
    "Freediving Philippines is a community app for discovering dive spots, learning through guides, joining events and groups, finding buddies, and supporting the freediving community in the Philippines.",
    "",
    `Canonical site: ${siteConfig.url}`,
    "",
    "This file lists public, user-facing pages and Markdown alternates. It excludes signed-in areas, member-only spaces, booking flows, payment flows, moderation tools, and local workbench files.",
    "",
  ];

  for (const section of sectionOrder) {
    const entries = aiReadableEntries.filter((entry) => entry.section === section);
    if (!entries.length) continue;
    lines.push(`## ${section}`, "");
    for (const entry of entries) {
      lines.push(`- ${entry.title}`);
      lines.push(`  HTML: ${absolutePublicUrl(entry.htmlPath)}`);
      lines.push(`  Markdown: ${absolutePublicUrl(entry.markdownPath)}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}
