"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { AuthGuard, RequirePermission } from "@/components/auth/guard";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exploreApi } from "@/features/diveSpots/api/explore-v1";
import { getApiErrorMessage } from "@/lib/http/api-error";

export default function ModerationExploreSitesPage() {
  const pendingQuery = useQuery({
    queryKey: ["moderation-explore-pending"],
    queryFn: () => exploreApi.listPendingSites(),
  });

  const items = pendingQuery.data?.items ?? [];

  return (
    <AuthGuard requiredRole="MODERATOR" title="Moderator access required" description="Only moderators can review dive site submissions.">
      <RequirePermission perm="explore.moderate" title="Missing explore.moderate permission" description="Your account cannot review dive site submissions.">
        <div className="container mx-auto p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Pending Dive Sites</h1>
              <p className="text-muted-foreground">Approve real sites. Reject weak or unsafe submissions.</p>
            </div>

            {pendingQuery.error ? (
              <p className="text-sm text-red-600">{getApiErrorMessage(pendingQuery.error, "Failed to load pending dive sites")}</p>
            ) : null}

            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle>{item.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{item.area}</p>
                    </div>
                    <Badge variant="secondary">{item.moderationState}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Submitted by {item.submittedByDisplayName || item.submittedByAppUserId || "member"} on{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="capitalize">{item.difficulty}</Badge>
                      {item.hazards.slice(0, 3).map((hazard) => (
                        <Badge key={hazard} variant="outline">{hazard}</Badge>
                      ))}
                    </div>
                    <Link href={`/moderation/explore-sites/${item.id}`} className={buttonVariants()}>
                      Review submission
                    </Link>
                  </CardContent>
                </Card>
              ))}

              {!pendingQuery.isLoading && items.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">No pending dive sites right now.</CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </RequirePermission>
    </AuthGuard>
  );
}
