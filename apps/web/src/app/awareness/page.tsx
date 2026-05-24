import type { Metadata } from "next";

import { ParkedFeaturePage } from "@/components/product/parked-feature-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AwarenessPage() {
  return (
    <ParkedFeaturePage
      title="Awareness wall is parked"
      description="The awareness wall is not open yet. Community updates belong in Chika, Groups, and Events until this area has a clear purpose and review process."
    />
  );
}
