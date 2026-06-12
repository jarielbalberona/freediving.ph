import { Galeria } from "@nandorojo/galeria";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import {
  MobileActionSheet,
  MobileCard,
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import {
  useProfileDiveMemoriesPageQuery,
} from "@/features/profiles/hooks/use-profile-activity-query";
import { useCreateDiveMemoryMutation } from "@/features/profiles/hooks/use-profile-experience-mutations";
import { safeProfileUsername } from "@/features/profiles/lib/profile-format";

type MediaGalleryItem = {
  id: string;
  kind: "memory" | "post";
  subtitle: string;
  url: string;
};

const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const formatShortDate = (value: string | undefined) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

export function ProfileDiveMemoryEntryScreen() {
  const params = useLocalSearchParams<{
    entrySlug?: string | string[];
    username?: string | string[];
  }>();
  const entrySlug = firstParam(params.entrySlug)?.trim().toLowerCase();
  const username = safeProfileUsername(firstParam(params.username));
  const pageQuery = useProfileDiveMemoriesPageQuery(username, entrySlug);
  const [activeTab, setActiveTab] = useState<"media" | "posts">("media");
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const createMemory = useCreateDiveMemoryMutation(username ?? "");

  const page = pageQuery.data;
  const site = page?.site;
  const entry = page?.entry;
  const isOwner = page?.profile.viewerIsOwner ?? false;
  const mediaItems = useMemo<MediaGalleryItem[]>(
    () => [
      ...(page?.proofItems.map((item) => ({
        id: item.id,
        kind: "post" as const,
        subtitle: item.caption?.trim() || "Location post",
        url: item.media.url,
      })) ?? []),
      ...(page?.memoryItems.flatMap((item) =>
        item.attachments.map((attachment) => ({
          id: attachment.id,
          kind: "memory" as const,
          subtitle: item.title || item.body?.trim() || "Memory",
          url: attachment.media.url,
        })),
      ) ?? []),
    ],
    [page],
  );

  return (
    <MobileScrollScreen subtitle="Dive Memories" title={site?.name || "Dive spot"}>
      <Stack.Screen options={{ title: site?.name || "Dive spot" }} />

      {!username || !entrySlug ? (
        <MobileErrorState
          message="This dive memory page needs both a diver and dive spot."
          title="Dive memories unavailable"
        />
      ) : null}

      {pageQuery.isLoading && !page ? (
        <MobileLoadingState message="Loading dive memories." />
      ) : null}

      {pageQuery.error && !page ? (
        <MobileErrorState
          message="Memories from this dive spot cannot be shown right now."
          title="Dive memories unavailable"
        />
      ) : null}

      {page && site && entry ? (
        <View className="gap-4">
          <MobileSection>
            <MobileCard>
              <View className="gap-3">
                <View className="gap-1">
                  <Text className="text-2xl font-semibold text-foreground">
                    {site.name}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {site.area || "Dive spot"}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <View className="rounded-full bg-secondary px-3 py-2">
                    <Text className="text-xs font-semibold text-muted-foreground">
                      Media
                    </Text>
                    <Text className="mt-0.5 text-sm font-semibold text-foreground">
                      {entry.mediaCount}
                    </Text>
                  </View>
                  <View className="rounded-full bg-secondary px-3 py-2">
                    <Text className="text-xs font-semibold text-muted-foreground">
                      Memories
                    </Text>
                    <Text className="mt-0.5 text-sm font-semibold text-foreground">
                      {entry.memoryCount}
                    </Text>
                  </View>
                  <View className="rounded-full bg-secondary px-3 py-2">
                    <Text className="text-xs font-semibold text-muted-foreground">
                      Updated
                    </Text>
                    <Text className="mt-0.5 text-sm font-semibold text-foreground">
                      {formatShortDate(entry.lastUpdatedAt)}
                    </Text>
                  </View>
                </View>
                {isOwner ? (
                  <MobileButton
                    onPress={() => setComposerOpen(true)}
                    variant="secondary"
                  >
                    Share memory
                  </MobileButton>
                ) : null}
              </View>
            </MobileCard>
          </MobileSection>

          <MobileSection>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === "media" }}
                className={`rounded-full border px-4 py-2 ${
                  activeTab === "media"
                    ? "border-primary bg-secondary"
                    : "border-border bg-card"
                }`}
                onPress={() => setActiveTab("media")}
              >
                <Text className="text-sm font-semibold text-foreground">Media</Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === "posts" }}
                className={`rounded-full border px-4 py-2 ${
                  activeTab === "posts"
                    ? "border-primary bg-secondary"
                    : "border-border bg-card"
                }`}
                onPress={() => setActiveTab("posts")}
              >
                <Text className="text-sm font-semibold text-foreground">Posts</Text>
              </Pressable>
            </View>
          </MobileSection>

          {activeTab === "media" ? (
            <MobileSection title="Photos and videos">
              {mediaItems.length === 0 ? (
                <MobileEmptyState
                  description={
                    isOwner
                      ? "Location posts and memory photos will show up here."
                      : "No visible photos or videos are available for this dive spot yet."
                  }
                  title="No media yet"
                />
              ) : (
                <Galeria closeIconName="xmark" theme="light" urls={mediaItems.map((item) => item.url)}>
                  <View className="flex-row flex-wrap gap-2">
                    {mediaItems.map((item, index) => (
                      <View
                        key={item.id}
                        className="overflow-hidden rounded-2xl bg-secondary"
                        style={{ width: "31.5%" }}
                      >
                        <Galeria.Image
                          index={index}
                          style={{ aspectRatio: 1, width: "100%" }}
                        >
                          <Image
                            accessibilityLabel={item.subtitle}
                            contentFit="cover"
                            source={{ uri: item.url }}
                            style={{ aspectRatio: 1, width: "100%" }}
                          />
                        </Galeria.Image>
                        <View className="px-2 py-2">
                          <Text className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            {item.kind === "memory" ? "Memory" : "Post"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </Galeria>
              )}
            </MobileSection>
          ) : null}

          {activeTab === "posts" ? (
            <MobileSection title="Memories from this dive spot">
              {(page.memoryItems ?? []).length === 0 ? (
                <MobileEmptyState
                  description={
                    isOwner
                      ? "Share a memory from this dive spot."
                      : "Nothing public has been shared for this dive spot yet."
                  }
                  title="No memories yet"
                />
              ) : (
                <View className="gap-3">
                  {page.memoryItems.map((item) => (
                    <MobileCard key={item.id}>
                      <Text className="text-sm font-semibold text-foreground">
                        {item.title || "Dive memory"}
                      </Text>
                      {item.body ? (
                        <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                          {item.body}
                        </Text>
                      ) : null}
                      <Text className="mt-2 text-xs text-muted-foreground">
                        {formatShortDate(item.occurredAt)}
                      </Text>
                    </MobileCard>
                  ))}
                </View>
              )}
            </MobileSection>
          ) : null}

          <MobileActionSheet
            onClose={() => setComposerOpen(false)}
            title="Share memory"
            visible={composerOpen}
          >
            <View className="gap-3">
              <TextInput
                className="rounded-2xl border border-border bg-card px-3 py-3 text-foreground"
                onChangeText={setTitle}
                placeholder="Title"
                placeholderTextColor="#64748b"
                value={title}
              />
              <TextInput
                className="min-h-28 rounded-2xl border border-border bg-card px-3 py-3 text-foreground"
                multiline
                onChangeText={setBody}
                placeholder="Share what stood out from this dive"
                placeholderTextColor="#64748b"
                textAlignVertical="top"
                value={body}
              />
              {createMemory.error instanceof Error ? (
                <Text className="text-sm text-destructive">
                  {createMemory.error.message}
                </Text>
              ) : null}
              <MobileButton
                disabled={createMemory.isPending}
                onPress={() => {
                  if (!site?.diveSiteId || !title.trim()) return;
                  createMemory.mutate(
                    {
                      body: body.trim() || undefined,
                      diveSiteId: site.diveSiteId,
                      title: title.trim(),
                      visibility: "public",
                    },
                    {
                      onSuccess: () => {
                        setBody("");
                        setTitle("");
                        setComposerOpen(false);
                      },
                    },
                  );
                }}
              >
                Share memory
              </MobileButton>
            </View>
          </MobileActionSheet>
        </View>
      ) : null}
    </MobileScrollScreen>
  );
}
