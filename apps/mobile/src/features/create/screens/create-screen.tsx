import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@clerk/expo";

import {
  MobileActionSheet,
  MobileEmptyState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { useChikaCategoriesQuery } from "@/features/chika/hooks/use-chika-categories-query";
import { useCreateChikaThreadMutation } from "@/features/chika/hooks/use-chika-mutations";
import { MediaComposerSheet } from "@/features/media/components/media-composer-sheet";
import { useLocalDraft } from "@/local/drafts/use-local-draft";
import { useOutbox } from "@/local/outbox/use-outbox";
import { PendingSyncPanel } from "@/local/sync/pending-sync-panel";

type CreateMode = "photo" | "chika" | undefined;

export function CreateScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const [mode, setMode] = useState<CreateMode>();
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const categoriesQuery = useChikaCategoriesQuery();
  const createThread = useCreateChikaThreadMutation();
  const chikaDraft = useLocalDraft<{
    categoryId?: string;
    content: string;
    title: string;
  }>("chika_thread");
  const postComposerDraft = useLocalDraft<{ kind: string }>("post_composer");
  const outbox = useOutbox();
  const categories = categoriesQuery.data?.items ?? [];
  const selectedCategoryId = categoryId || categories[0]?.id || "";

  useEffect(() => {
    if (!chikaDraft.draft) return;
    setCategoryId(chikaDraft.draft.payload.categoryId ?? "");
    setTitle(chikaDraft.draft.payload.title);
    setContent(chikaDraft.draft.payload.content);
  }, [chikaDraft.draft]);

  const requireSignedIn = () => {
    if (!isLoaded) {
      setActionMessage("Checking your session. Try again in a moment.");
      return false;
    }
    if (!isSignedIn) {
      setActionMessage("Sign in to publish in Chika.");
      return false;
    }
    setActionMessage(undefined);
    return true;
  };

  return (
    <MobileScrollScreen subtitle="Create" title="Post">
      <MobileSection
        description="Choose whether this post belongs in photos and moments or in Chika."
        title="What do you want to post?"
      >
        <View className="gap-3">
          <PendingSyncPanel
            isSyncing={outbox.isSyncing}
            items={outbox.items}
            message={
              chikaDraft.status === "saved"
                ? "Saved as draft"
                : postComposerDraft.status === "saved"
                  ? "Saved as draft"
                  : outbox.message
            }
            onDiscard={outbox.discard}
            onSyncNow={outbox.syncNow}
          />
          <MobileButton onPress={() => setMode("photo")}>Photos or moments</MobileButton>
          <MobileButton variant="secondary" onPress={() => setMode("chika")}>
            Post in Chika
          </MobileButton>
        </View>
      </MobileSection>

      <MobileActionSheet
        title="Photos or moments"
        visible={mode === "photo"}
        onClose={() => setMode(undefined)}
      >
        <MediaComposerSheet onClose={() => setMode(undefined)} />
      </MobileActionSheet>

      <MobileActionSheet
        title="Post in Chika"
        visible={mode === "chika"}
        onClose={() => setMode(undefined)}
      >
        <View className="gap-3">
          {categoriesQuery.isLoading ? (
            <MobileLoadingState message="Loading Chika categories." />
          ) : null}
          {categories.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {categories.map((category) => (
                <MobileButton
                  key={category.id}
                  variant={selectedCategoryId === category.id ? "primary" : "secondary"}
                  onPress={() => setCategoryId(category.id)}
                >
                  {category.name}
                </MobileButton>
              ))}
            </View>
          ) : null}
          <TextInput
            className="rounded-2xl border border-border bg-card p-3 text-foreground"
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor="#64748b"
            value={title}
          />
          <TextInput
            className="min-h-32 rounded-2xl border border-border bg-card p-3 text-foreground"
            multiline
            onChangeText={setContent}
            placeholder="What's the Chika?"
            placeholderTextColor="#64748b"
            value={content}
          />
          <Text className="text-xs text-muted-foreground">
            Pseudonymous categories use the display name returned by the server.
          </Text>
          {actionMessage ? (
            <Text className="text-xs text-muted-foreground">{actionMessage}</Text>
          ) : null}
          <MobileButton
            variant="secondary"
            onPress={() =>
              void chikaDraft.save({
                categoryId: selectedCategoryId,
                content,
                title,
              })
            }
          >
            Save as draft
          </MobileButton>
          <MobileButton
            disabled={
              createThread.isPending ||
              !selectedCategoryId ||
              title.trim().length < 3 ||
              content.trim().length < 3
            }
            onPress={() => {
              if (!requireSignedIn()) return;
              createThread.mutate(
                {
                  categoryId: selectedCategoryId,
                  content: content.trim(),
                  title: title.trim(),
                },
                {
                  onError: () => {
                    void chikaDraft.save({
                      categoryId: selectedCategoryId,
                      content: content.trim(),
                      title: title.trim(),
                    });
                    setActionMessage("Could not publish in Chika. Saved as draft.");
                  },
                  onSuccess: (thread) => {
                    void chikaDraft.clearSubmitted();
                    setMode(undefined);
                    setTitle("");
                    setContent("");
                    router.push({
                      pathname: "/(app)/(tabs)/chika/[slug]",
                      params: { slug: thread.slug },
                    });
                  },
                },
              );
            }}
          >
            Publish Chika
          </MobileButton>
        </View>
      </MobileActionSheet>
    </MobileScrollScreen>
  );
}
