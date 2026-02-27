"use client";

import { useState } from "react";

import { AuthGuard } from "@/components/auth/guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useAcceptBuddyRequest,
  useBuddies,
  useCancelBuddyRequest,
  useDeclineBuddyRequest,
  useIncomingBuddyRequests,
  useOutgoingBuddyRequests,
  useRemoveBuddy,
  useSendBuddyRequest,
} from "@/features/buddies";
import { getApiErrorMessage } from "@/lib/http/api-error";

export default function BuddiesPage() {
  const [targetUserId, setTargetUserId] = useState("");

  const { data: incoming, error: incomingError } = useIncomingBuddyRequests();
  const { data: outgoing, error: outgoingError } = useOutgoingBuddyRequests();
  const { data: buddies, error: buddiesError } = useBuddies();

  const sendRequest = useSendBuddyRequest();
  const acceptRequest = useAcceptBuddyRequest();
  const declineRequest = useDeclineBuddyRequest();
  const cancelRequest = useCancelBuddyRequest();
  const removeBuddy = useRemoveBuddy();

  return (
    <AuthGuard title="Sign in to access buddies" description="Buddy tools are available to authenticated members only.">
      <div className="container mx-auto space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Buddies</h1>
          <p className="text-muted-foreground">Manage buddy requests and your buddy list.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Buddy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Target User ID (UUID)"
                value={targetUserId}
                onChange={(event) => setTargetUserId(event.target.value)}
              />
              <Button
                disabled={!targetUserId.trim() || sendRequest.isPending}
                onClick={() => {
                  sendRequest.mutate(targetUserId.trim(), {
                    onSuccess: () => setTargetUserId(""),
                  });
                }}
              >
                Send Request
              </Button>
            </div>
            {sendRequest.error ? (
              <p className="text-sm text-destructive">{getApiErrorMessage(sendRequest.error, "Failed to send request")}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Incoming Requests
              {incoming?.items?.length ? (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {incoming.items.length}
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomingError ? (
              <p className="text-sm text-destructive">{getApiErrorMessage(incomingError, "Failed to load incoming requests")}</p>
            ) : (incoming?.items ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No incoming requests.</p>
            ) : (
              (incoming?.items ?? []).map((item) => (
                <div key={item.request.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{item.requester.displayName || item.requester.username}</p>
                    <p className="text-xs text-muted-foreground">@{item.requester.username}</p>
                    <p className="text-xs text-muted-foreground">
                      Sent {new Date(item.request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={acceptRequest.isPending}
                      onClick={() => acceptRequest.mutate(item.request.id)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={declineRequest.isPending}
                      onClick={() => declineRequest.mutate(item.request.id)}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outgoing Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {outgoingError ? (
              <p className="text-sm text-destructive">{getApiErrorMessage(outgoingError, "Failed to load outgoing requests")}</p>
            ) : (outgoing?.items ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No outgoing requests.</p>
            ) : (
              (outgoing?.items ?? []).map((item) => (
                <div key={item.request.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{item.target.displayName || item.target.username}</p>
                    <p className="text-xs text-muted-foreground">@{item.target.username}</p>
                    <p className="text-xs text-muted-foreground">
                      Pending since {new Date(item.request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={cancelRequest.isPending}
                    onClick={() => cancelRequest.mutate(item.request.id)}
                  >
                    Cancel
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Buddy List
              {buddies?.items?.length ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({buddies.items.length})
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {buddiesError ? (
              <p className="text-sm text-destructive">{getApiErrorMessage(buddiesError, "Failed to load buddies")}</p>
            ) : (buddies?.items ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No buddies yet.</p>
            ) : (
              (buddies?.items ?? []).map((buddy) => (
                <div key={buddy.userId} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{buddy.displayName || buddy.username}</p>
                    <p className="text-xs text-muted-foreground">@{buddy.username}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={removeBuddy.isPending}
                    onClick={() => removeBuddy.mutate(buddy.userId)}
                  >
                    Remove
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
