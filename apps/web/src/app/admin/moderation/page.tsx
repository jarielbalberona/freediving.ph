"use client";

import {
  Flag,
  MessageSquareWarning,
  MapPinned,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

import { AuthGuard } from "@/components/auth/guard";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/features/auth/session";

const QUEUES = [
  {
    href: "/admin/moderation/reports",
    title: "Reports",
    description: "Review user-submitted reports and move them to resolution.",
    permission: "reports.read",
    icon: Flag,
  },
  {
    href: "/admin/moderation/explore-sites",
    title: "Dive site submissions",
    description: "Approve or reject pending sites and suggested edits.",
    permission: "explore.moderate",
    icon: MapPinned,
  },
  {
    href: "/admin/moderation/reports",
    title: "Chika and user actions",
    description:
      "Use report detail pages for Chika hide/unhide and user sanctions.",
    permission: "moderation.write",
    icon: MessageSquareWarning,
  },
];

export default function ModerationOverviewPage() {
  return (
    <AuthGuard
      requiredRole="MODERATOR"
      title="Moderator access required"
      description="Only operators can access moderation queues."
    >
      <ModerationOverviewContent />
    </AuthGuard>
  );
}

function ModerationOverviewContent() {
  const session = useSession();
  const visibleQueues = QUEUES.filter((queue) =>
    session.hasPermission(queue.permission),
  );

  return (
    <main className="container mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 space-y-1">
        <h1 className="text-2xl font-semibold tracking-normal">Moderation</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Triage the trust queues that exist today. Anything not listed here
          needs a backend route and operator workflow before it should be
          treated as launched.
        </p>
      </div>

      {visibleQueues.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="flex gap-3 p-4 text-sm text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p>No moderation queues are available for this account.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {visibleQueues.map((queue) => (
            <Link key={queue.title} href={queue.href}>
              <Card className="h-full rounded-lg shadow-none transition-colors hover:border-primary/40">
                <CardContent className="space-y-3 p-4">
                  <queue.icon className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold">{queue.title}</h2>
                    <p className="text-sm leading-5 text-muted-foreground">
                      {queue.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
