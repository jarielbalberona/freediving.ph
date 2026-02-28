"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/features/auth/session";
import { useUpdateMyProfile } from "@/features/profiles/hooks/mutations";
import { useMyProfile } from "@/features/profiles/hooks/queries";
import { getApiErrorMessage } from "@/lib/http/api-error";

export default function OnboardingPage() {
  const router = useRouter();
  const session = useSession();
  const { data } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const [homeArea, setHomeArea] = useState("");
  const [interests, setInterests] = useState("");
  const [certLevel, setCertLevel] = useState("");

  useEffect(() => {
    if (data?.profile) {
      setHomeArea(data.profile.homeArea ?? "");
      setInterests((data.profile.interests ?? []).join(", "));
      setCertLevel(data.profile.certLevel ?? "");
    }
  }, [data?.profile]);

  useEffect(() => {
    if (session.status === "signed_out") {
      router.replace("/sign-in");
    }
  }, [router, session.status]);

  if (session.status === "signed_out") {
    return null;
  }

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,_#fffaf0_0%,_#f8fafc_100%)] px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Card className="rounded-[28px]">
          <CardHeader>
            <CardTitle className="font-serif text-3xl text-zinc-900">Fast onboarding. No junk questions.</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Home area</Label>
              <Input value={homeArea} onChange={(event) => setHomeArea(event.target.value)} placeholder="Dauin, Negros Oriental" />
            </div>
            <div className="space-y-2">
              <Label>Interests</Label>
              <Textarea value={interests} onChange={(event) => setInterests(event.target.value)} placeholder="reef, training, fun_dive" />
            </div>
            <div className="space-y-2">
              <Label>Cert level (optional)</Label>
              <Input value={certLevel} onChange={(event) => setCertLevel(event.target.value)} placeholder="AIDA 2 / Wave 1 / Instructor" />
            </div>
            <Button
              disabled={updateProfile.isPending || !homeArea.trim()}
              onClick={() =>
                updateProfile.mutate(
                  {
                    homeArea: homeArea.trim(),
                    location: homeArea.trim(),
                    interests: interests
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                    certLevel: certLevel.trim() || undefined,
                  },
                  {
                    onSuccess: () => {
                      router.push(`/explore?area=${encodeURIComponent(homeArea.trim())}`);
                    },
                  },
                )
              }
            >
              {updateProfile.isPending ? "Saving..." : "Continue to Explore"}
            </Button>
            {updateProfile.error ? (
              <p className="text-sm text-red-600">{getApiErrorMessage(updateProfile.error, "Failed to save onboarding")}</p>
            ) : null}
            <p className="text-sm text-zinc-600">
              After this, Buddy Finder will default to your area and Explore can open nearby sites immediately.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
