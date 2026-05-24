import {
  markdownResponse,
  notFoundMarkdownResponse,
  toMarkdown,
} from "./markdown";
import {
  getFeatureMarkdown,
  getGuideMarkdown,
  getLocationMarkdown,
} from "./registry";

export function featureMarkdownRoute(slug: string): Response {
  const document = getFeatureMarkdown(slug);
  return document ? markdownResponse(toMarkdown(document)) : notFoundMarkdownResponse();
}

export function guideMarkdownRoute(slug: string): Response {
  const document = getGuideMarkdown(slug);
  return document ? markdownResponse(toMarkdown(document)) : notFoundMarkdownResponse();
}

export function locationMarkdownRoute(slug: string): Response {
  const document = getLocationMarkdown(slug);
  return document ? markdownResponse(toMarkdown(document)) : notFoundMarkdownResponse();
}
