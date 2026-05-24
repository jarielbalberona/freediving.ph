import type { Metadata } from "next";

import { ParkedFeaturePage } from "@/components/product/parked-feature-page";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ServicesPage() {
  return (
    <ParkedFeaturePage
      title="Generic services are parked"
      description="General service listings are not open yet. For lessons, instructors, courses, and bookings, use the Schools area instead."
    />
  );
}
