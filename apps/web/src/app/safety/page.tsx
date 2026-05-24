import type { Metadata } from "next";

import { ParkedFeaturePage } from "@/components/product/parked-feature-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SafetyPage() {
  return (
    <ParkedFeaturePage
      title="Safety resources are parked"
      description="Safety resources are not open yet. Until they are reviewed and maintained properly, the safer path is to rely on schools, instructors, event details, and community guidance."
    />
  );
}
