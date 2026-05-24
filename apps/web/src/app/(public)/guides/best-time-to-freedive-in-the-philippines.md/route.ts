import { guideMarkdownRoute } from "@/features/public-content/ai-readable/routeFactories";

export function GET() {
  return guideMarkdownRoute("best-time-to-freedive-in-the-philippines");
}
