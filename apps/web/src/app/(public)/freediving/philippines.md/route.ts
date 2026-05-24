import { locationMarkdownRoute } from "@/features/public-content/ai-readable/routeFactories";

export function GET() {
  return locationMarkdownRoute("philippines");
}
