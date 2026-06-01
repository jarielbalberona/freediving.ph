import { Link } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import type {
  BuddyProfile,
  IncomingBuddyRequest,
  OutgoingBuddyRequest,
} from "@freediving.ph/types";

import { UserIdentityRow } from "@/components/social";
import {
  MobileEmptyState,
  MobileErrorState,
  MobileLoadingState,
} from "@/components/shell";
import { MobileButton } from "@/components/ui/mobile-button";
import {
  useAcceptBuddyRequestMutation,
  useCancelBuddyRequestMutation,
  useDeclineBuddyRequestMutation,
  useRemoveBuddyMutation,
} from "@/features/buddies/hooks/use-buddy-mutations";
import {
  useBuddyListQuery,
  useIncomingBuddyRequestsQuery,
  useOutgoingBuddyRequestsQuery,
} from "@/features/buddies/hooks/use-buddy-relationship-queries";
import { profileRoute } from "@/features/profiles/lib/profile-format";

function BuddyProfileRow({
  action,
  profile,
}: {
  action?: ReactNode;
  profile: BuddyProfile;
}) {
  const href = profileRoute(profile.username);
  const row = (
    <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
      <View className="min-w-0 flex-1">
        <UserIdentityRow
          avatarUrl={profile.avatarUrl}
          displayName={profile.displayName || profile.username}
          showLocation={false}
          size="sm"
          username={profile.username}
        />
      </View>
      {action}
    </View>
  );

  return href ? (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link">{row}</Pressable>
    </Link>
  ) : (
    row
  );
}

function IncomingRequestRow({
  item,
}: {
  item: IncomingBuddyRequest;
}) {
  const accept = useAcceptBuddyRequestMutation();
  const decline = useDeclineBuddyRequestMutation();
  const disabled = accept.isPending || decline.isPending;

  return (
    <BuddyProfileRow
      profile={item.requester}
      action={
        <View className="gap-2">
          <MobileButton
            disabled={disabled}
            onPress={() => accept.mutate(item.request.id)}
          >
            Accept
          </MobileButton>
          <MobileButton
            disabled={disabled}
            onPress={() => decline.mutate(item.request.id)}
            variant="secondary"
          >
            Decline
          </MobileButton>
        </View>
      }
    />
  );
}

function OutgoingRequestRow({
  item,
}: {
  item: OutgoingBuddyRequest;
}) {
  const cancel = useCancelBuddyRequestMutation();

  return (
    <BuddyProfileRow
      profile={item.target}
      action={
        <MobileButton
          disabled={cancel.isPending}
          onPress={() => cancel.mutate(item.request.id)}
          variant="secondary"
        >
          Cancel
        </MobileButton>
      }
    />
  );
}

function BuddyRow({ profile }: { profile: BuddyProfile }) {
  const remove = useRemoveBuddyMutation();

  return (
    <BuddyProfileRow
      profile={profile}
      action={
        <MobileButton
          disabled={remove.isPending}
          onPress={() => remove.mutate(profile.userId)}
          variant="secondary"
        >
          Remove
        </MobileButton>
      }
    />
  );
}

export function BuddyRelationshipSection() {
  const buddies = useBuddyListQuery();
  const incoming = useIncomingBuddyRequestsQuery();
  const outgoing = useOutgoingBuddyRequestsQuery();
  const isLoading = buddies.isLoading || incoming.isLoading || outgoing.isLoading;
  const error = buddies.error || incoming.error || outgoing.error;
  const buddyItems = buddies.data?.items ?? [];
  const incomingItems = incoming.data?.items ?? [];
  const outgoingItems = outgoing.data?.items ?? [];

  if (isLoading) {
    return <MobileLoadingState message="Loading buddy relationships." />;
  }

  if (error) {
    return (
      <View className="gap-3">
        <MobileErrorState
          message="Could not load buddy relationships."
          title="Buddies unavailable"
        />
        <MobileButton
          onPress={() => {
            void buddies.refetch();
            void incoming.refetch();
            void outgoing.refetch();
          }}
          variant="secondary"
        >
          Try again
        </MobileButton>
      </View>
    );
  }

  if (
    buddyItems.length === 0 &&
    incomingItems.length === 0 &&
    outgoingItems.length === 0
  ) {
    return (
      <MobileEmptyState
        description="Buddy requests and accepted buddies will appear here."
        title="No buddy relationships yet"
      />
    );
  }

  return (
    <View className="gap-4">
      {incomingItems.length > 0 ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">Incoming</Text>
          {incomingItems.map((item) => (
            <IncomingRequestRow item={item} key={item.request.id} />
          ))}
        </View>
      ) : null}
      {outgoingItems.length > 0 ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">Outgoing</Text>
          {outgoingItems.map((item) => (
            <OutgoingRequestRow item={item} key={item.request.id} />
          ))}
        </View>
      ) : null}
      {buddyItems.length > 0 ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">Buddies</Text>
          {buddyItems.map((profile) => (
            <BuddyRow key={profile.userId} profile={profile} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
