import type { Metadata } from "next";

import { ParkedFeaturePage } from "@/components/product/parked-feature-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CollaborationPage() {
  return (
    <ParkedFeaturePage
      title="Collaboration board is parked"
      description="A separate collaboration board is not open yet. Use Groups, Events, Chika, and Messages for community coordination today."
    />
  );
}
