import type { Metadata } from "next";

import {
  LocationIndexPage,
  locationIndexMetadata,
} from "@/features/public-content/components/LocationIndexPage";
import { buildPublicMetadata } from "@/features/public-content/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: locationIndexMetadata.title,
  description: locationIndexMetadata.description,
  path: "/freediving",
});

export default function FreedivingLocationsPage() {
  return <LocationIndexPage />;
}
