import {
  markdownResponse,
  toMarkdown,
} from "@/features/public-content/ai-readable/markdown";
import { getGuideMarkdown } from "@/features/public-content/ai-readable/registry";

export function GET() {
  return markdownResponse(toMarkdown(getGuideMarkdown()!));
}
