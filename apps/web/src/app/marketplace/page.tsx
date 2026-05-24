import type { Metadata } from "next";

import { ParkedFeaturePage } from "@/components/product/parked-feature-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MarketplacePage() {
  return (
    <ParkedFeaturePage
      title="Marketplace is not launched"
      description="Gear listings are not open yet. The current priority is helping divers discover places, people, schools, events, and active community conversations."
    />
  );
}
