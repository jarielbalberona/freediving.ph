import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CreateDiveMemoryPostPage from "@/features/profile/pages/CreateDiveMemoryPostPage";
import { isReservedProfileSlug } from "@/features/profile/utils/reservedSlugs";
import { normalizeUsername } from "@/lib/routes";

type PageProps = {
  params: Promise<{ entrySlug: string; username: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || isReservedProfileSlug(normalizedUsername)) {
    return {
      title: "Create memory post",
    };
  }

  return {
    title: `Create memory post · @${normalizedUsername}`,
    description: `Create a memory post on @${normalizedUsername}'s dive page.`,
    robots: { index: false, follow: false },
  };
}

export default async function DiveMemoriesCreateRoute({ params }: PageProps) {
  const { entrySlug, username } = await params;
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || isReservedProfileSlug(normalizedUsername)) {
    notFound();
  }

  return (
    <CreateDiveMemoryPostPage
      username={normalizedUsername}
      entrySlug={entrySlug}
    />
  );
}
