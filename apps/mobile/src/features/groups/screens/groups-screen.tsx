import { Link, router } from "expo-router";
import type { Href } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useAuth } from "@clerk/expo";

import type { CreateGroupRequest, Group } from "@freediving.ph/types";

import { SocialListRow, SocialMetadataLine, StatusPill } from "@/components/social";
import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { useCreateGroupMutation } from "@/features/groups/hooks/use-group-mutations";
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

type GroupListFilters = {
  mine: boolean;
  search: string;
  visibility: "all" | "public" | "private";
};

type CreateGroupFormState = {
  bio: string;
  description: string;
  joinPolicy: CreateGroupRequest["joinPolicy"];
  location: string;
  name: string;
  visibility: CreateGroupRequest["visibility"];
};

const initialFilters: GroupListFilters = {
  mine: false,
  search: "",
  visibility: "all",
};

const initialCreateForm: CreateGroupFormState = {
  bio: "",
  description: "",
  joinPolicy: "open",
  location: "",
  name: "",
  visibility: "public",
};

export function GroupsScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const canUseMemberActions = isLoaded && Boolean(isSignedIn);
  const [filters, setFilters] = useState<GroupListFilters>(initialFilters);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateGroupFormState>(initialCreateForm);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const createGroupMutation = useCreateGroupMutation();
  const groupsQuery = useGroupsQuery({
    limit: 30,
    mine: filters.mine && canUseMemberActions,
    search: filters.search,
    visibility: filters.visibility === "all" ? undefined : filters.visibility,
  });
  const groups = groupsQuery.data?.groups ?? [];
  const filtersApplied =
    Boolean(filters.search.trim()) ||
    filters.visibility !== "all" ||
    filters.mine;

  return (
    <MobileScrollScreen subtitle="Community groups" title="Groups">
      <MobileSection
        description="Browse public and member-visible groups from the Freediving Philippines community."
        title="Groups"
      >
        <View className="mb-4 gap-3">
          <TextInput
            accessibilityLabel="Search groups"
            className="rounded-2xl border border-border bg-card p-3 text-foreground"
            onChangeText={(search) =>
              setFilters((current) => ({ ...current, search }))
            }
            placeholder="Search by group name or location"
            placeholderTextColor="#64748b"
            value={filters.search}
          />
          <View className="flex-row flex-wrap gap-2">
            {(["all", "public", "private"] as const).map((visibility) => (
              <MobileButton
                key={visibility}
                variant={
                  filters.visibility === visibility ? "primary" : "secondary"
                }
                onPress={() =>
                  setFilters((current) => ({ ...current, visibility }))
                }
              >
                {visibility === "all"
                  ? "All"
                  : visibility === "public"
                    ? "Public"
                    : "Private"}
              </MobileButton>
            ))}
            <MobileButton
              disabled={!canUseMemberActions}
              variant={filters.mine ? "primary" : "secondary"}
              onPress={() =>
                setFilters((current) => ({ ...current, mine: !current.mine }))
              }
            >
              My groups
            </MobileButton>
          </View>
          {filters.mine && !canUseMemberActions ? (
            <Text className="text-sm text-muted-foreground">
              Sign in to view your groups.
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-2">
            <MobileButton
              disabled={!canUseMemberActions}
              variant="secondary"
              onPress={() => {
                setFormMessage(null);
                setShowCreate((value) => !value);
              }}
            >
              Create group
            </MobileButton>
            {filtersApplied ? (
              <MobileButton
                variant="ghost"
                onPress={() => setFilters(initialFilters)}
              >
                Reset filters
              </MobileButton>
            ) : null}
          </View>
          {showCreate && canUseMemberActions ? (
            <View className="gap-3 rounded-2xl border border-border bg-card p-3">
              <Text className="text-sm font-semibold text-foreground">
                Create group
              </Text>
              {formMessage ? (
                <Text className="text-sm text-muted-foreground">
                  {formMessage}
                </Text>
              ) : null}
              <TextInput
                className="rounded-2xl border border-border bg-background p-3 text-foreground"
                maxLength={120}
                onChangeText={(name) =>
                  setCreateForm((current) => ({ ...current, name }))
                }
                placeholder="Group name"
                placeholderTextColor="#64748b"
                value={createForm.name}
              />
              <TextInput
                className="rounded-2xl border border-border bg-background p-3 text-foreground"
                maxLength={280}
                onChangeText={(bio) =>
                  setCreateForm((current) => ({ ...current, bio }))
                }
                placeholder="Short bio"
                placeholderTextColor="#64748b"
                value={createForm.bio}
              />
              <TextInput
                className="rounded-2xl border border-border bg-background p-3 text-foreground"
                maxLength={255}
                onChangeText={(location) =>
                  setCreateForm((current) => ({ ...current, location }))
                }
                placeholder="Location or area"
                placeholderTextColor="#64748b"
                value={createForm.location}
              />
              <TextInput
                className="min-h-24 rounded-2xl border border-border bg-background p-3 text-foreground"
                maxLength={2000}
                multiline
                onChangeText={(description) =>
                  setCreateForm((current) => ({ ...current, description }))
                }
                placeholder="Description"
                placeholderTextColor="#64748b"
                value={createForm.description}
              />
              <View className="flex-row flex-wrap gap-2">
                {(["public", "private"] as const).map((visibility) => (
                  <MobileButton
                    key={visibility}
                    variant={
                      createForm.visibility === visibility
                        ? "primary"
                        : "secondary"
                    }
                    onPress={() =>
                      setCreateForm((current) => ({
                        ...current,
                        joinPolicy:
                          visibility === "private" ? "invite_only" : current.joinPolicy,
                        visibility,
                      }))
                    }
                  >
                    {visibility === "public" ? "Public" : "Private"}
                  </MobileButton>
                ))}
                {(["open", "invite_only"] as const).map((joinPolicy) => (
                  <MobileButton
                    disabled={
                      createForm.visibility === "private" && joinPolicy === "open"
                    }
                    key={joinPolicy}
                    variant={
                      createForm.joinPolicy === joinPolicy
                        ? "primary"
                        : "secondary"
                    }
                    onPress={() =>
                      setCreateForm((current) => ({ ...current, joinPolicy }))
                    }
                  >
                    {joinPolicy === "open" ? "Open" : "Invite only"}
                  </MobileButton>
                ))}
              </View>
              <MobileButton
                disabled={createGroupMutation.isPending}
                onPress={() => {
                  const name = createForm.name.trim();
                  if (name.length < 3) {
                    setFormMessage("Group name must be at least 3 characters.");
                    return;
                  }
                  createGroupMutation.mutate(
                    {
                      bio: createForm.bio,
                      description: createForm.description,
                      joinPolicy: createForm.joinPolicy,
                      location: createForm.location,
                      locationName: createForm.location,
                      locationSource: createForm.location.trim()
                        ? "manual"
                        : undefined,
                      name,
                      visibility: createForm.visibility,
                    },
                    {
                      onError: () => setFormMessage("Could not create group."),
                      onSuccess: (response) => {
                        setCreateForm(initialCreateForm);
                        setShowCreate(false);
                        setFormMessage(null);
                        router.push({
                          pathname: "/(app)/(tabs)/(home)/groups/[slug]",
                          params: { slug: response.group.slug },
                        });
                      },
                    },
                  );
                }}
              >
                Create
              </MobileButton>
            </View>
          ) : null}
        </View>

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
