"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { MapPin, Search, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/components/auth/guard";
import {
  useAcceptBuddyRequest,
  useActiveBuddies,
  useBuddyFinderSearch,
  useBuddyRequests,
  useRejectBuddyRequest,
  useSendBuddyRequest,
} from "@/features/buddies";
import { getApiErrorMessage } from "@/lib/http/api-error";

export default function BuddiesPage() {
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");

  const { data: requests, error: requestsError } = useBuddyRequests();
  const { data: buddies = [], isLoading: isBuddiesLoading, error: buddiesError } = useActiveBuddies();
  const { data: finderResults = [], isLoading: isFinderLoading, error: finderError } = useBuddyFinderSearch({
    search: search || undefined,
    location: location || undefined,
    experienceLevel: experienceLevel || undefined,
    limit: 20,
    offset: 0,
  });

  const sendRequest = useSendBuddyRequest();
  const acceptRequest = useAcceptBuddyRequest();
  const rejectRequest = useRejectBuddyRequest();

  return (
    <AuthGuard title="Sign in to access buddies" description="Buddy tools are available to authenticated members only.">
      <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Buddy System</h1>
        <p className="text-muted-foreground">Manage requests, active buddies, and discover new buddies.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incoming Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requestsError ? (
            <p className="text-sm text-destructive">{getApiErrorMessage(requestsError, "Failed to load buddy requests")}</p>
          ) : (requests?.incoming ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No incoming requests.</p>
          ) : (
            (requests?.incoming ?? []).map((item) => (
              <div className="flex items-center justify-between rounded-md border p-3" key={item.request.id}>
                <div>
                  <p className="font-medium">{item.fromUser?.alias || item.fromUser?.username || "Unknown diver"}</p>
                  <p className="text-xs text-muted-foreground">Request #{item.request.id}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => acceptRequest.mutate(item.request.id)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rejectRequest.mutate({ requestId: item.request.id })}>
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Buddies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {buddiesError ? (
            <p className="text-sm text-destructive">{getApiErrorMessage(buddiesError, "Failed to load buddies")}</p>
          ) : isBuddiesLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : buddies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active buddies yet.</p>
          ) : (
            buddies.map((buddy) => (
              <div className="rounded-md border p-3" key={buddy.id}>
                <p className="font-medium">{buddy.alias || buddy.username || `Diver #${buddy.id}`}</p>
                <p className="text-xs text-muted-foreground">
                  {buddy.experienceLevel || "Experience n/a"} • {buddy.location || buddy.homeDiveArea || "Location n/a"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Buddy Finder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or alias" />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Filter by area" />
            <Input value={experienceLevel} onChange={(event) => setExperienceLevel(event.target.value)} placeholder="Filter by experience" />
          </div>

          {finderError ? (
            <p className="text-sm text-destructive">{getApiErrorMessage(finderError, "Failed to load finder results")}</p>
          ) : isFinderLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            finderResults.map((candidate) => (
              <div className="flex items-center justify-between rounded-md border p-3" key={candidate.id}>
                <div>
                  <p className="font-medium">{candidate.alias || candidate.username || `Diver #${candidate.id}`}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {candidate.location || candidate.homeDiveArea || "Coarse location unavailable"}
                  </p>
                </div>
                <Button size="sm" onClick={() => sendRequest.mutate(candidate.id)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Request
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      </div>
    </AuthGuard>
  );
}
