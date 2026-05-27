import { Link } from "expo-router";
import type { Href } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { Group } from "@freediving.ph/types";

import { SocialListRow, SocialMetadataLine, StatusPill } from "@/components/social";
import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { useGroupsQuery } from "@/features/groups/hooks/use-groups-query";

const safeSlug = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed &&
    !trimmed.includes("/") &&
    !trimmed.includes("?") &&
    !trimmed.includes("#")
    ? trimmed
    : undefined;
};

function GroupCard({ group }: { group: Group }) {
  const slug = safeSlug(group.slug);
  const content = (
    <SocialListRow
      body={group.bio || group.description}
      meta={[group.visibility, `${group.memberCount} members`]}
      name="Group"
      status={
        group.joinPolicy === "open" ? null : <StatusPill>Invite only</StatusPill>
      }
      title={group.name}
    >
      <SocialMetadataLine
        values={[group.joinPolicy === "open" ? "Open to join" : "Invite only"]}
      />
    </SocialListRow>
  );

  if (!slug) return content;

  return (
    <Link
      href={
        {
          pathname: "/(app)/(tabs)/(home)/groups/[slug]",
          params: { slug },
        } as unknown as Href
      }
      asChild
    >
      <Pressable accessibilityRole="link">{content}</Pressable>
    </Link>
  );
}

export function GroupsScreen() {
  const groupsQuery = useGroupsQuery();
  const groups = groupsQuery.data?.groups ?? [];

  return (
    <MobileScrollScreen subtitle="Community groups" title="Groups">
      <MobileSection
        description="Browse public and member-visible groups from the Freediving Philippines community."
        title="Groups"
      >
        {groupsQuery.isLoading ? <MobileLoadingState message="Loading groups." /> : null}

        {groupsQuery.error ? (
          <View className="gap-3">
            <MobileErrorState
              message="Groups are taking longer than expected to load."
              title="Groups unavailable"
            />
            <MobileButton variant="secondary" onPress={() => void groupsQuery.refetch()}>
              Try again
            </MobileButton>
          </View>
        ) : null}

        {!groupsQuery.isLoading && !groupsQuery.error && groups.length === 0 ? (
          <MobileEmptyState
            description="Groups will appear here as the community creates them."
            title="No groups yet"
          />
        ) : null}

        {!groupsQuery.isLoading && !groupsQuery.error && groups.length > 0 ? (
          <View>
            {groups.map((group) => (
              <GroupCard group={group} key={group.id} />
            ))}
          </View>
        ) : null}
      </MobileSection>
    </MobileScrollScreen>
  );
}
