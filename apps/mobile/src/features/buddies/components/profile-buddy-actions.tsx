import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import type { ProfileView } from "@freediving.ph/types";

import { MobileButton } from "@/components/ui/mobile-button";
import {
  useCancelBuddyRequestMutation,
  useRemoveBuddyMutation,
  useSendBuddyRequestMutation,
} from "@/features/buddies/hooks/use-buddy-mutations";
import {
  useBuddyListQuery,
  useIncomingBuddyRequestsQuery,
  useOutgoingBuddyRequestsQuery,
} from "@/features/buddies/hooks/use-buddy-relationship-queries";
import { useOpenDirectMessageThreadMutation } from "@/features/messages/hooks/use-message-mutations";

type RelationshipState =
  | { status: "self" | "none" | "loading" }
  | { status: "buddy" }
  | { requestId: string; status: "incoming" | "outgoing" };

const getRelationshipState = (
  profile: ProfileView,
  buddyList: ReturnType<typeof useBuddyListQuery>["data"],
  incoming: ReturnType<typeof useIncomingBuddyRequestsQuery>["data"],
  outgoing: ReturnType<typeof useOutgoingBuddyRequestsQuery>["data"],
  isLoading: boolean,
): RelationshipState => {
  if (profile.viewerRelationship?.isSelf || profile.viewerRelationship?.canEdit) {
    return { status: "self" };
  }
  if (isLoading) return { status: "loading" };
  if (buddyList?.items.some((buddy) => buddy.userId === profile.id)) {
    return { status: "buddy" };
  }
  const incomingRequest = incoming?.items.find(
    (item) => item.requester.userId === profile.id,
  );
  if (incomingRequest) {
    return { requestId: incomingRequest.request.id, status: "incoming" };
  }
  const outgoingRequest = outgoing?.items.find(
    (item) => item.target.userId === profile.id,
  );
  if (outgoingRequest) {
    return { requestId: outgoingRequest.request.id, status: "outgoing" };
  }
  return { status: "none" };
};

export function ProfileBuddyActions({ profile }: { profile: ProfileView }) {
  const { isLoaded, isSignedIn } = useAuth();
  const buddyList = useBuddyListQuery();
  const incoming = useIncomingBuddyRequestsQuery();
  const outgoing = useOutgoingBuddyRequestsQuery();
  const sendRequest = useSendBuddyRequestMutation();
  const cancelRequest = useCancelBuddyRequestMutation();
  const removeBuddy = useRemoveBuddyMutation();
  const openMessage = useOpenDirectMessageThreadMutation();
  const [message, setMessage] = useState<string | null>(null);
  const relationship = getRelationshipState(
    profile,
    buddyList.data,
    incoming.data,
    outgoing.data,
    buddyList.isLoading || incoming.isLoading || outgoing.isLoading,
  );
  const disabled =
    !isLoaded ||
    !isSignedIn ||
    sendRequest.isPending ||
    cancelRequest.isPending ||
    removeBuddy.isPending ||
    openMessage.isPending;
  const canMessage =
    Boolean(profile.viewerRelationship?.canMessage) &&
    relationship.status !== "self";

  if (relationship.status === "self") return null;

  const requireSignedIn = () => {
    setMessage(null);
    if (!isLoaded) {
      setMessage("Checking your session. Try again in a moment.");
      return false;
    }
    if (!isSignedIn) {
      setMessage("Sign in to connect with this diver.");
      return false;
    }
    return true;
  };

  const openThread = () => {
    if (!requireSignedIn()) return;
    openMessage.mutate(profile.id, {
      onError: () => setMessage("Could not open messages for this diver."),
      onSuccess: (thread) => {
        router.push({
          pathname: "/(app)/(tabs)/messages/[threadId]",
          params: { threadId: thread.id },
        } as Href);
      },
    });
  };

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2">
        {relationship.status === "loading" ? (
          <MobileButton disabled variant="secondary">
            Checking buddy state
          </MobileButton>
        ) : null}
        {relationship.status === "none" ? (
          <MobileButton
            disabled={disabled}
            onPress={() => {
              if (!requireSignedIn()) return;
              sendRequest.mutate(profile.id, {
                onError: () => setMessage("Could not send buddy request."),
                onSuccess: () => setMessage("Buddy request sent."),
              });
            }}
            variant="secondary"
          >
            Add buddy
          </MobileButton>
        ) : null}
        {relationship.status === "outgoing" ? (
          <MobileButton
            disabled={disabled}
            onPress={() =>
              cancelRequest.mutate(relationship.requestId, {
                onError: () => setMessage("Could not cancel buddy request."),
                onSuccess: () => setMessage("Buddy request cancelled."),
              })
            }
            variant="secondary"
          >
            Cancel request
          </MobileButton>
        ) : null}
        {relationship.status === "incoming" ? (
          <Text className="text-sm text-muted-foreground">
            This diver sent you a buddy request. Manage it in Buddies.
          </Text>
        ) : null}
        {relationship.status === "buddy" ? (
          <MobileButton
            disabled={disabled}
            onPress={() =>
              removeBuddy.mutate(profile.id, {
                onError: () => setMessage("Could not remove buddy."),
                onSuccess: () => setMessage("Buddy removed."),
              })
            }
            variant="secondary"
          >
            Remove buddy
          </MobileButton>
        ) : null}
        {canMessage ? (
          <MobileButton disabled={disabled} onPress={openThread}>
            Message
          </MobileButton>
        ) : null}
      </View>
      {message ? (
        <Text className="text-sm text-muted-foreground">{message}</Text>
      ) : null}
    </View>
  );
}
