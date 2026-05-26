import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@clerk/expo";

import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
  MobileScrollScreen,
  MobileSection,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import { useChikaCategoriesQuery } from "@/features/chika/hooks/use-chika-categories-query";
import { useCreateChikaThreadMutation } from "@/features/chika/hooks/use-chika-mutations";
import { useLocalDraft } from "@/local/drafts/use-local-draft";

export function ChikaPostScreen() {
  const { isLoaded, isSignedIn } = useAuth();
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

  if (!isLoaded) {
    return (
      <MobileScrollScreen subtitle="Community threads" title="Post Chika">
        <MobileLoadingState message="Checking your session." />
      </MobileScrollScreen>
    );
  }

  if (!isSignedIn) {
    return (
      <MobileScrollScreen subtitle="Community threads" title="Post Chika">
        <MobileEmptyState
          description="Sign in to start a Chika thread with the community."
          title="Sign in to post Chika"
        />
      </MobileScrollScreen>
    );
  }

  return (
    <MobileScrollScreen subtitle="Community threads" title="Post Chika">
      <MobileSection
        description="Start a discussion with divers around the Philippines."
        title="Post Chika"
      >
        <View className="gap-3">
          {categoriesQuery.isLoading ? (
            <MobileLoadingState message="Loading Chika categories." />
          ) : null}
          {categoriesQuery.error ? (
            <View className="gap-3">
              <MobileErrorState
                message="Chika categories are taking longer than expected to load."
                title="Categories unavailable"
              />
              <MobileButton
                variant="secondary"
                onPress={() => void categoriesQuery.refetch()}
              >
                Try again
              </MobileButton>
            </View>
          ) : null}
          {categories.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {categories.map((category) => (
                <MobileButton
                  disabled={createThread.isPending}
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
      </MobileSection>
    </MobileScrollScreen>
  );
}
