"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommunityEmptyState, CommunityHeader } from "@/components/community/community-page";
import Link from "next/link";
import { useSession } from "@/features/auth/session";
import { useGroup } from "@/features/groups/hooks/queries";
import { GroupManagementShell } from "./group-management-shell";

export function GroupManagementWorkspacePage({ slug }: { slug: string }) {
  const session = useSession();
  const groupQuery = useGroup(slug, "private", session.status === "signed_in");

  if (session.status === "loading") {
    return <CommunityEmptyState title="Loading" description="Loading group workspace..." />;
  }

  if (session.status !== "signed_in") {
    return (
      <CommunityEmptyState
        title="Group management"
        description="Sign in to access group management features."
      />
    );
  }

  if (groupQuery.isLoading) {
    return <CommunityEmptyState title="Loading" description="Loading group workspace..." />;
  }

  if (!groupQuery.data) {
    return <CommunityHeader title="Group not found" subtitle="No group details were available." />;
  }

  return (
    <GroupManagementShell group={groupQuery.data}>
      <CommunityEmptyState
        title={groupQuery.data.name}
        description="Group workspace is available for future management operations."
        action={
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/management/groups" />}
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
        }
      />
    </GroupManagementShell>
  );
}

export function GroupManagementSectionPage({
  slug,
  title,
  description,
}: {
  slug: string;
  title: string;
  description: string;
}) {
  const session = useSession();
  const groupQuery = useGroup(slug, "private", session.status === "signed_in");

  if (session.status === "loading") {
    return (
      <CommunityEmptyState title="Loading" description="Loading group workspace..." />
    );
  }

  if (session.status !== "signed_in") {
    return (
      <CommunityEmptyState
        title="Group management"
        description="Sign in to access group management features."
      />
    );
  }

  if (groupQuery.isLoading) {
    return (
      <CommunityEmptyState title="Loading" description="Loading group workspace..." />
    );
  }

  if (!groupQuery.data) {
    return <CommunityEmptyState title="Group not found" description="This group could not be opened." />;
  }

  return (
    <GroupManagementShell group={groupQuery.data}>
      <CommunityEmptyState title={title} description={description} />
    </GroupManagementShell>
  );
}
