"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";

import { VisibilitySelector, type VisibilityValue } from "@/components/common/visibility-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CreatePersonalBestRequest } from "@freediving.ph/types";
import {
  useCreatePersonalBest,
  useDeletePersonalBest,
  useProfileByUsername,
  useUpdateOwnProfile,
} from "@/features/profiles";

export default function ProfileView() {
  const { user, isLoaded } = useUser();
  const username = user?.username ?? null;

  const { data, isLoading } = useProfileByUsername(username);
  const createPersonalBest = useCreatePersonalBest(username);
  const deletePersonalBest = useDeletePersonalBest(username);
  const updateOwnProfile = useUpdateOwnProfile(username);

  const [newPbDiscipline, setNewPbDiscipline] = useState<CreatePersonalBestRequest["discipline"]>("CWT");
  const [newPbValue, setNewPbValue] = useState("");
  const [newPbUnit, setNewPbUnit] = useState("m");
  const [profileVisibility, setProfileVisibility] = useState<VisibilityValue>("public");

  if (!isLoaded || isLoading) {
    return <div className="container mx-auto p-6">Loading profile...</div>;
  }

  if (!user || !username) {
    return <div className="container mx-auto p-6">Sign in to view your profile.</div>;
  }

  const profile = data?.profile;
  const personalBests = data?.personalBests ?? [];

  return (
    <div className="container mx-auto space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-lg font-semibold">{profile?.name || username}</p>
            <p className="text-sm text-muted-foreground">@{profile?.username || username}</p>
            <p className="text-sm text-muted-foreground">{profile?.bio || "No bio yet."}</p>
          </div>

          <VisibilitySelector
            value={profileVisibility}
            onChange={(value) => {
              setProfileVisibility(value);
              updateOwnProfile.mutate({
                visibility: value === "public" ? "PUBLIC" : "MEMBERS_ONLY",
              });
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Bests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {personalBests.map((pb) => (
            <div key={pb.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-semibold">{pb.discipline}</p>
                <p className="text-sm text-muted-foreground">
                  {pb.resultValue} {pb.resultUnit} • {pb.visibility}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  deletePersonalBest.mutate(pb.id);
                }}
              >
                Delete
              </Button>
            </div>
          ))}

          <div className="grid gap-2 md:grid-cols-4">
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={newPbDiscipline}
              onChange={(event) => setNewPbDiscipline(event.target.value as CreatePersonalBestRequest["discipline"])}
            >
              {["STA", "DYN", "DYNB", "DNF", "CWT", "CWTB", "FIM", "CNF", "VWT", "OTHER"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Input value={newPbValue} onChange={(event) => setNewPbValue(event.target.value)} placeholder="Value" />
            <Input value={newPbUnit} onChange={(event) => setNewPbUnit(event.target.value)} placeholder="Unit" />
            <Button
              onClick={() => {
                if (!newPbValue.trim()) return;
                createPersonalBest.mutate({
                  discipline: newPbDiscipline,
                  resultValue: newPbValue,
                  resultUnit: newPbUnit,
                  visibility: "PUBLIC",
                });
                setNewPbValue("");
              }}
            >
              Add PB
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
