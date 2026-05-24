import {
  getFeatureMarkdown,
} from "@/features/public-content/ai-readable/registry";
import {
  markdownResponse,
  toMarkdown,
} from "@/features/public-content/ai-readable/markdown";

export function GET() {
  return markdownResponse(toMarkdown(getFeatureMarkdown()!));
}
