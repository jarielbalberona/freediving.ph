import { guideMarkdownRoute } from "@/features/public-content/ai-readable/routeFactories";

export function GET() {
  return guideMarkdownRoute("how-to-start-freediving-in-the-philippines");
}
