import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { ProfileDetailRow } from "@/features/profiles/components/profile-detail-row";
import { safeImageUrl } from "@/features/profiles/lib/profile-format";
import type { ProfilePost } from "@freediving.ph/types";

type ProfilePostCardProps = {
  post: ProfilePost;
};

export function ProfilePostCard({ post }: ProfilePostCardProps) {
  const imageUrl = safeImageUrl(post.thumbUrl);
  const content = (
    <View className="rounded-2xl border border-border bg-card p-4">
      {imageUrl ? (
        <Image
          accessibilityLabel=""
          className="h-44 w-full rounded-xl bg-secondary"
          contentFit="cover"
          source={{ uri: imageUrl }}
          transition={150}
        />
      ) : null}
      <Text className="mt-3 text-sm font-semibold text-foreground">
        {post.siteName || "Dive post"}
      </Text>
      {post.siteArea ? (
        <Text className="mt-1 text-xs text-muted-foreground">{post.siteArea}</Text>
      ) : null}
      {post.caption ? (
        <Text className="mt-2 text-sm leading-6 text-muted-foreground" numberOfLines={4}>
          {post.caption}
        </Text>
      ) : null}
      <Text className="mt-2 text-xs text-muted-foreground">
        {post.likeCount} likes · {post.commentCount} comments
      </Text>
    </View>
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
