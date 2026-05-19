const LINK_PROTOCOL = /^[a-z][a-z\d+.-]*:/i;
const SAFE_LINK_PROTOCOLS = /^(?:https?|mailto|tel):/i;
const MARKDOWN_IMAGE = /!\[[^\]]*]\([^)]*\)/g;
const MARKDOWN_LINK = /\[([^\]]+)]\(([^)]*)\)/g;

export function safeMarkdownUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("//")) {
    return "";
  }
  if (LINK_PROTOCOL.test(trimmed) && !SAFE_LINK_PROTOCOLS.test(trimmed)) {
    return "";
  }
  return trimmed;
}

export function stripMarkdownForPreview(value: string): string {
  return value
    .replace(MARKDOWN_IMAGE, "")
    .replace(MARKDOWN_LINK, "$1")
    .replace(/[`*_~>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
