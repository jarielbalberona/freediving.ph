import { guideMarkdownRoute } from "@/features/public-content/ai-readable/routeFactories";

export function GET() {
  return guideMarkdownRoute("how-to-find-a-freediving-buddy");
}
