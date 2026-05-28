import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { SocialListRow } from "@/components/social";
import { ProfileDetailRow } from "@/features/profiles/components/profile-detail-row";
import { safeImageUrl } from "@/features/profiles/lib/profile-format";
import type { ProfilePost } from "@freediving.ph/types";

type ProfilePostCardProps = {
  post: ProfilePost;
};

export function ProfilePostCard({ post }: ProfilePostCardProps) {
  const imageUrl = safeImageUrl(post.thumbUrl);
  const mediaMetrics = [
    `${post.likeCount} likes`,
    `${post.commentCount} comments`,
    post.siteArea,
  ].filter(Boolean);

  const content = (
    <SocialListRow
      body={post.caption}
      meta={mediaMetrics}
      name={post.siteName || "Dive post"}
      title={post.siteName || "Dive post"}
    >
      {imageUrl ? (
        <Image
          accessibilityLabel=""
          className="mb-3 w-full rounded-xl bg-secondary"
          contentFit="cover"
          source={{ uri: imageUrl }}
          style={{ aspectRatio: 4 / 5 }}
          transition={150}
        />
      ) : null}
    </SocialListRow>
  );

  if (!post.siteSlug) return content;

  return (
    <Link
      href={{
        pathname: "/(app)/(tabs)/(home)/explore/[slug]",
        params: { slug: post.siteSlug },
      }}
      asChild
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open post ${post.siteName || "dive post"}`}
        className="active:opacity-80"
        style={({ pressed }) => ({
          opacity: pressed ? 0.9 : 1,
          transform: pressed ? [{ scale: 0.985 }] : [],
        })}
      >
        {content}
      </Pressable>
    </Link>
  );
}

export function ProfilePostFallback({ error }: { error?: unknown }) {
  return (
    <ProfileDetailRow
      label="Posts"
      value={
        error
          ? "Posts are unavailable right now."
          : "Public media posts will appear here."
      }
    />
  );
}
