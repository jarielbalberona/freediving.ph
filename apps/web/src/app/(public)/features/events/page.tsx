import type { Metadata } from "next";

import { FeaturePageTemplate } from "@/features/public-content/components/FeaturePageTemplate";
import { getFeaturePage } from "@/features/public-content/content/features";
import { buildPublicMetadata } from "@/features/public-content/seo/metadata";

const feature = getFeaturePage("events");

export const metadata: Metadata = buildPublicMetadata({
  title: feature.title,
  description: feature.description,
  path: feature.href,
});

export default function EventsFeaturePage() {
  return <FeaturePageTemplate feature={feature} />;
}
