import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ProfilePage from "@/features/profile/pages/ProfilePage";
import { isReservedProfileSlug } from "@/features/profile/utils/reservedSlugs";
import { normalizeUsername } from "@/lib/routes";

type PageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || isReservedProfileSlug(normalizedUsername)) {
    return {
      title: "Profile not found",
    };
  }

  return {
    title: `@${normalizedUsername}`,
    description: `View @${normalizedUsername}'s profile on Freediving Philippines.`,
  };
}

export default async function UsernameProfileRoute({ params }: PageProps) {
  const { username } = await params;
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || isReservedProfileSlug(normalizedUsername)) {
    notFound();
  }

  return <ProfilePage username={normalizedUsername} />;
}
