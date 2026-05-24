import { guideMarkdownRoute } from "@/features/public-content/ai-readable/routeFactories";

export function GET() {
  return guideMarkdownRoute("freediving-safety-basics");
}
