"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMyProfile, useUpdateMyProfile } from "@/features/profiles";
import { useBlockUser, useBlockedUsers, useUnblockUser } from "@/features/blocks";
import { getApiErrorMessage } from "@/lib/http/api-error";

export default function ProfileView() {
  const { data, isLoading } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const { data: blockedUsers } = useBlockedUsers();

  const profile = data?.profile;
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [blockedUserId, setBlockedUserId] = useState("");

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="container mx-auto p-6">Profile unavailable.</div>;
  }

  const currentDisplayName = displayName || profile.displayName;
  const currentBio = bio || profile.bio || "";
  const currentLocation = location || profile.location || "";

  return (
    <div className="container mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-lg font-semibold">{profile.displayName || profile.username}</p>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          <p className="text-sm text-muted-foreground">{profile.bio || "No bio yet."}</p>
          <p className="text-sm text-muted-foreground">{profile.location || "No location yet."}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Display name"
            value={currentDisplayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <Textarea
            placeholder="Bio"
            value={currentBio}
            onChange={(event) => setBio(event.target.value)}
          />
          <Input
            placeholder="Coarse location"
            value={currentLocation}
            onChange={(event) => setLocation(event.target.value)}
          />
          <Button
            disabled={updateProfile.isPending}
            onClick={() => {
              updateProfile.mutate({
                displayName: currentDisplayName,
                bio: currentBio,
                location: currentLocation,
              });
            }}
          >
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Safety: Blocks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="User ID to block"
              value={blockedUserId}
              onChange={(event) => setBlockedUserId(event.target.value)}
            />
            <Button
              disabled={!blockedUserId.trim() || blockUser.isPending}
              onClick={() => {
                blockUser.mutate(blockedUserId.trim(), {
                  onSuccess: () => setBlockedUserId(""),
                });
              }}
            >
              Block
            </Button>
          </div>
          {blockUser.error ? (
            <p className="text-sm text-destructive">{getApiErrorMessage(blockUser.error, "Failed to block user")}</p>
          ) : null}

          <div className="space-y-2">
            {blockedUsers?.items?.length ? (
              blockedUsers.items.map((item) => (
                <div key={item.blockedUserId} className="flex items-center justify-between rounded-md border p-2">
                  <div>
                    <p className="text-sm font-medium">{item.displayName || item.username}</p>
                    <p className="text-xs text-muted-foreground">{item.blockedUserId}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      unblockUser.mutate(item.blockedUserId);
                    }}
                  >
                    Unblock
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No blocked users yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
