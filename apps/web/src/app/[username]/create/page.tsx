import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CreateProfilePostPage from "@/features/profile/pages/CreateProfilePostPage";
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
      title: "Create photo post",
    };
  }

  return {
    title: `Create photo post · @${normalizedUsername}`,
    description: `Create a grouped photo post for @${normalizedUsername}.`,
  };
}

export default async function UsernameCreateProfilePostRoute({
  params,
}: PageProps) {
  const { username } = await params;
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || isReservedProfileSlug(normalizedUsername)) {
    notFound();
  }

  return <CreateProfilePostPage username={normalizedUsername} />;
}
