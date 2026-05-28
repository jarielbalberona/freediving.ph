"use client";

import type { Group } from "@freediving.ph/types";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { useSession } from "@/features/auth/session";
import { useUserGroups } from "@/features/groups/hooks/queries";
import {
  CommunityEmptyState,
  CommunityHeader,
} from "@/components/community/community-page";
import { Button } from "@/components/ui/button";
import { ManagementEntityCard } from "@/components/layout/management-entity-card";
import { ManagementPageContainer } from "@/components/layout/management-page-container";

export default function ManagementGroupsPage() {
  const session = useSession();
  const groupsQuery = useUserGroups(1, 50, session.status === "signed_in");

  if (session.status === "loading") {
    return null;
  }

  if (session.status !== "signed_in") {
    return (
      <ManagementPageContainer variant="wide">
        <CommunityEmptyState
          title="Groups"
          description="Sign in to access groups you own or moderate."
        />
      </ManagementPageContainer>
    );
  }

  if (groupsQuery.isLoading) {
    return (
      <ManagementPageContainer variant="wide">
        <CommunityEmptyState title="Loading" description="Loading groups..." />
      </ManagementPageContainer>
    );
  }

  if (groupsQuery.isError) {
    return (
      <ManagementPageContainer variant="wide">
        <CommunityEmptyState
          title="Could not load groups"
          description="Unable to load your managed groups right now. Please try again."
        />
      </ManagementPageContainer>
    );
  }

  const managedGroups = groupsQuery.data?.groups ?? [];

  return (
    <ManagementPageContainer variant="wide">
      <CommunityHeader
        title="Groups"
        subtitle="Manage group details, members, posts, and settings."
        action={
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/groups" />}
          >
            <Plus />
            Add group
          </Button>
        }
      />

      {managedGroups.length === 0 ? (
        <CommunityEmptyState
          title="Group management"
          description="Manage groups you own or moderate."
          action={
            <>
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href="/groups" />}
              >
                Add group
              </Button>
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href="/groups" />}
                className="ml-2"
              >
                Explore public groups
              </Button>
            </>
          }
        />
      ) : null}

      {managedGroups.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {managedGroups.map((group) => (
            <GroupManagementCard key={group.id} group={group} />
          ))}
        </div>
      ) : null}
    </ManagementPageContainer>
  );
}

function GroupManagementCard({ group }: { group: Group }) {
  return (
    <ManagementEntityCard
      title={group.name}
      description={group.bio || "No bio yet."}
      location={group.locationName || "Location not set"}
      status={group.status}
      href={`/management/groups/${encodeURIComponent(group.slug)}`}
      placeholderIcon={Users}
      stats={[
        { label: "Members", value: String(group.memberCount) },
        { label: "Posts", value: String(group.postCount) },
        { label: "Visibility", value: group.visibility ?? "Private" },
      ]}
    />
  );
}
