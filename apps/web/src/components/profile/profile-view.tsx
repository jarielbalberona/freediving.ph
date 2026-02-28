"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TrustCard } from "@/components/trust-card";
import {
  useMyProfile,
  useProfileByUserId,
  useSavedHub,
  useSaveUser,
  useUnsaveUser,
  useUpdateMyProfile,
} from "@/features/profiles";
import { useBlockUser, useBlockedUsers, useUnblockUser } from "@/features/blocks";
import { useSendBuddyRequest } from "@/features/buddies";
import { getApiErrorMessage } from "@/lib/http/api-error";

export default function ProfileView() {
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const myProfileQuery = useMyProfile();
  const profileByUserIdQuery = useProfileByUserId(targetUserId);
  const { data: savedHub } = useSavedHub(Boolean(targetUserId));
  const saveUser = useSaveUser();
  const unsaveUser = useUnsaveUser();
  const updateProfile = useUpdateMyProfile();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const sendBuddyRequest = useSendBuddyRequest();
  const { data: blockedUsers } = useBlockedUsers();

  const isOwnProfile = !targetUserId || targetUserId === myProfileQuery.data?.profile.userId;
  const activeQuery = isOwnProfile ? myProfileQuery : profileByUserIdQuery;
  const profile = activeQuery.data?.profile;
  const isSaved = Boolean(profile && savedHub?.users.some((item) => item.userId === profile.userId));
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [blockedUserId, setBlockedUserId] = useState("");
  const [buddyTargetUserId, setBuddyTargetUserId] = useState("");

  if (activeQuery.isLoading) {
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
        <CardContent className="space-y-4">
          <p className="text-lg font-semibold">{profile.displayName || profile.username}</p>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          <p className="text-sm text-muted-foreground">{profile.bio || "No bio yet."}</p>
          <p className="text-sm text-muted-foreground">{profile.location || "No location yet."}</p>
          <TrustCard
            emailVerified={profile.emailVerified}
            phoneVerified={profile.phoneVerified}
            certLevel={profile.certLevel}
            buddyCount={profile.buddyCount}
            reportCount={profile.reportCount}
          />
          {!isOwnProfile ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  isSaved
                    ? unsaveUser.mutate(profile.userId)
                    : saveUser.mutate(profile.userId)
                }
              >
                {isSaved ? "Saved" : "Save profile"}
              </Button>
              <Button
                disabled={!profile.userId.trim() || sendBuddyRequest.isPending}
                onClick={() => sendBuddyRequest.mutate(profile.userId)}
              >
                Add Buddy
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isOwnProfile ? (
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
      ) : null}

      {isOwnProfile ? (
      <Card>
        <CardHeader>
          <CardTitle>Buddies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="User ID to add as buddy"
              value={buddyTargetUserId}
              onChange={(event) => setBuddyTargetUserId(event.target.value)}
            />
            <Button
              disabled={!buddyTargetUserId.trim() || sendBuddyRequest.isPending}
              onClick={() => {
                sendBuddyRequest.mutate(buddyTargetUserId.trim(), {
                  onSuccess: () => setBuddyTargetUserId(""),
                });
              }}
            >
              Add Buddy
            </Button>
          </div>
          {sendBuddyRequest.error ? (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(sendBuddyRequest.error, "Failed to send buddy request")}
            </p>
          ) : null}
        </CardContent>
      </Card>
      ) : null}

      {isOwnProfile ? (
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
      ) : null}
    </div>
  );
}
