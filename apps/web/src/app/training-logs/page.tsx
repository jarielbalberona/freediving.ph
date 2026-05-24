import type { Metadata } from "next";

import { ParkedFeaturePage } from "@/components/product/parked-feature-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TrainingLogsPage() {
  return (
    <ParkedFeaturePage
      title="Training logs are parked"
      description="Personal training journals are not open yet. For now, use Explore, Chika, Events, Profiles, Buddies, and Groups to stay connected with the local freediving community."
    />
  );
}
