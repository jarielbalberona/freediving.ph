import type { Metadata } from "next";
import { notFound } from "next/navigation";

import MediaPostDetailPage from "@/features/media/pages/MediaPostDetailPage";
import { isReservedProfileSlug } from "@/features/profile/utils/reservedSlugs";
import { normalizeUsername } from "@/lib/routes";

type PageProps = {
  params: Promise<{ username: string; postId: string }>;
};

export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || isReservedProfileSlug(normalizedUsername)) {
    return {
      title: "Post not found",
    };
  }

  return {
    title: `Media post · @${normalizedUsername}`,
    description: `View @${normalizedUsername}'s media post on Freediving Philippines.`,
    robots: { index: false, follow: true },
  };
}

export default async function UsernameMediaPostRoute({ params }: PageProps) {
  const { username, postId } = await params;
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || isReservedProfileSlug(normalizedUsername)) {
    notFound();
  }

  return <MediaPostDetailPage username={normalizedUsername} postId={postId} />;
}
