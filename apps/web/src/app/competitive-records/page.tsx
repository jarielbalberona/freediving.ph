import type { Metadata } from "next";

import { ParkedFeaturePage } from "@/components/product/parked-feature-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CompetitiveRecordsPage() {
  return (
    <ParkedFeaturePage
      title="Competitive records are parked"
      description="Competitive records are not open yet. Verified records need clear review rules and evidence handling before they should be shown to the community."
    />
  );
}
