import { guideMarkdownRoute } from "@/features/public-content/ai-readable/routeFactories";

export function GET() {
  return guideMarkdownRoute("what-to-bring-to-a-freediving-session");
}
