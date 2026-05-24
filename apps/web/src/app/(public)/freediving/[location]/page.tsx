import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LocationLandingPage } from "@/features/public-content/components/LocationLandingPage";
import {
  locationBySlug,
  locationPages,
} from "@/features/public-content/content/locations";
import { buildPublicMetadata } from "@/features/public-content/seo/metadata";

type PageProps = {
  params: Promise<{ location: string }>;
};

export function generateStaticParams() {
  return locationPages.map((location) => ({ location: location.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { location: slug } = await params;
  const location = locationBySlug.get(slug);
  if (!location) return {};

  return buildPublicMetadata({
    title: location.metaTitle,
    description: location.metaDescription,
    path: location.href,
  });
}

export default async function FreedivingLocationPage({ params }: PageProps) {
  const { location: slug } = await params;
  const location = locationBySlug.get(slug);

  if (!location) {
    notFound();
  }

  return <LocationLandingPage location={location} />;
}
