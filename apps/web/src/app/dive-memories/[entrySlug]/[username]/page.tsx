import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ProfileDiveMapEntryPage from "@/features/profile/pages/ProfileDiveMapEntryPage";
import { isReservedProfileSlug } from "@/features/profile/utils/reservedSlugs";
import { normalizeUsername } from "@/lib/routes";

type PageProps = {
  params: Promise<{ entrySlug: string; username: string }>;
};

export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { entrySlug, username } = await params;
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || isReservedProfileSlug(normalizedUsername)) {
    return { title: "Dive Memories page not found" };
  }

  return {
    title: `Dive Memories | @${normalizedUsername}`,
    description: `View ${entrySlug} memories and proof posts on @${normalizedUsername}'s profile.`,
    robots: { index: false, follow: true },
  };
}

export default async function DiveMemoriesEntryRoute({ params }: PageProps) {
  const { entrySlug, username } = await params;
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || isReservedProfileSlug(normalizedUsername)) {
    notFound();
  }

  return (
    <ProfileDiveMapEntryPage
      username={normalizedUsername}
      entrySlug={entrySlug}
    />
  );
}
