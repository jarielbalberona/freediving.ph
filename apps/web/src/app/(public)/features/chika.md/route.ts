import { featureMarkdownRoute } from "@/features/public-content/ai-readable/routeFactories";

export function GET() {
  return featureMarkdownRoute("chika");
}
