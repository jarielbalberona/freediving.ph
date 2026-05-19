import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ProfileSettingsPage from "@/features/profile/pages/ProfileSettingsPage";
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
      title: "Profile settings",
    };
  }

  return {
    title: `Profile settings · @${normalizedUsername}`,
    description: `Edit profile settings for @${normalizedUsername}.`,
  };
}

export default async function UsernameProfileSettingsRoute({
  params,
}: PageProps) {
  const { username } = await params;
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || isReservedProfileSlug(normalizedUsername)) {
    notFound();
  }

  return <ProfileSettingsPage username={normalizedUsername} />;
}
