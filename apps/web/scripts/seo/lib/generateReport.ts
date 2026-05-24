import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { redactSecrets, reportsDir } from "../config";

export type ReportInput = {
  kind: "audit" | "serp-rank" | "keyword-plan";
  command: string;
  provider: string;
  searchMarket?: string;
  targetBaseUrl?: string;
  cacheBehavior: string;
  paidWarning?: string;
  summary: string;
  sections: Array<{
    title: string;
    lines: string[];
  }>;
  json: unknown;
};

export function writeReports(input: ReportInput): {
  markdownPath: string;
  jsonPath: string;
} {
  mkdirSync(reportsDir, { recursive: true });
  const stamp = timestamp();
  const baseName = `${input.kind}-${stamp}`;
  const markdownPath = path.join(reportsDir, `${baseName}.md`);
  const jsonPath = path.join(reportsDir, `${baseName}.json`);
  const markdown = renderMarkdown(input);
  writeFileSync(markdownPath, redactSecrets(markdown));
  writeFileSync(jsonPath, `${redactSecrets(JSON.stringify(input.json, null, 2))}\n`);
  return { markdownPath, jsonPath };
}

function renderMarkdown(input: ReportInput): string {
  const header = [
    `# ${titleCase(input.kind)} Report`,
    "",
    `- Command: \`${input.command}\``,
    `- Provider: \`${input.provider}\``,
    input.searchMarket ? `- Search market: \`${input.searchMarket}\`` : null,
    input.targetBaseUrl ? `- Target base URL: \`${input.targetBaseUrl}\`` : null,
    `- Timestamp: \`${new Date().toISOString()}\``,
    `- Cache behavior: ${input.cacheBehavior}`,
    input.paidWarning ? `- Paid/live warning: ${input.paidWarning}` : null,
    "",
    `## Summary`,
    "",
    input.summary,
    "",
  ].filter(Boolean);

  const sections = input.sections.flatMap((section) => [
    `## ${section.title}`,
    "",
    ...section.lines.map((line) => (line.startsWith("- ") ? line : `- ${line}`)),
    "",
  ]);

  return `${[...header, ...sections].join("\n")}\n`;
}

function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function timestamp(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate(),
  )}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}
