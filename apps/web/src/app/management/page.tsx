"use client";

import Link from "next/link";
import { CalendarHeart, School, UserRoundPen, Users } from "lucide-react";

import { useSession } from "@/features/auth/session";
import { CommunityEmptyState, CommunityHeader } from "@/components/community/community-page";
import { ManagementPageContainer } from "@/components/layout/management-page-container";
import { Card, CardContent } from "@/components/ui/card";

export default function ManagementOverviewPage() {
  const session = useSession();

  if (session.status === "loading") {
    return null;
  }

  if (session.status !== "signed_in") {
    return (
      <ManagementPageContainer variant="wide">
        <CommunityEmptyState
          title="Management workspace"
          description="Sign in to access your owned events, schools, and operator tasks."
        />
      </ManagementPageContainer>
    );
  }

  return (
    <ManagementPageContainer variant="wide">
      <CommunityHeader
        title="Management"
        subtitle="Platform workspace for your owned schools and event operations."
      />
      <div className="grid gap-3 md:grid-cols-3">
        <ManagementCard
          href="/management/groups"
          title="Groups"
          icon={Users}
          description="Manage groups you own or moderate."
        />
        <ManagementCard
          href="/management/events"
          title="Events"
          icon={CalendarHeart}
          description="Manage participants, programs, payments, check-in, and event operations."
        />
        <ManagementCard
          href="/management/schools"
          title="Schools"
          icon={School}
          description="Manage schools, courses, sessions, bookings, and settings."
        />
        <ManagementCard
          href="/management/instructor-profile"
          title="Instructor Profile"
          icon={UserRoundPen}
          description="Manage your instructor profile and profile-facing details."
        />
      </div>
    </ManagementPageContainer>
  );
}

function ManagementCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: (typeof CalendarHeart) | (typeof School) | (typeof Users) | (typeof UserRoundPen);
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full">
        <CardContent className="flex gap-3 p-3">
          <Icon className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
