import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { SocialActionRow, SocialListRow } from "@/components/social";
import { ProfileDetailRow } from "@/features/profiles/components/profile-detail-row";
import { safeImageUrl } from "@/features/profiles/lib/profile-format";
import type { ProfilePost } from "@freediving.ph/types";

type ProfilePostCardProps = {
  post: ProfilePost;
};

export function ProfilePostCard({ post }: ProfilePostCardProps) {
  const imageUrl = safeImageUrl(post.thumbUrl);
  const content = (
    <SocialListRow
      body={post.caption}
      meta={[post.siteArea]}
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
      <SocialActionRow
        actions={[
          {
            accessibilityLabel: "Profile post likes",
            icon: "fish-outline",
            label: `${post.likeCount} likes`,
          },
          {
            accessibilityLabel: "Profile post comments",
            icon: "chatbubble-outline",
            label: `${post.commentCount} comments`,
          },
        ]}
      />
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
      <Pressable accessibilityRole="link">{content}</Pressable>
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
