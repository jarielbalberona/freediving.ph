"use client";

import { Award, BadgeCheck } from "lucide-react";

import {
  CommunityHeader,
  CommunityPageShell,
} from "@/components/community/community-page";
import { Badge } from "@/components/ui/badge";
import {
  instructorAgencyLabels,
  usePublicInstructor,
} from "@/features/instructors";
import { getApiErrorMessage } from "@/lib/http/api-error";

export function PublicInstructorPage({ username }: { username: string }) {
  const query = usePublicInstructor(username);
  const application = query.data?.application;
  const profile = application?.profile;
  const certifications = application?.certifications ?? [];

  return (
    <CommunityPageShell>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading instructor...</p>
      ) : null}
      {query.isError ? (
        <p className="text-sm text-muted-foreground">
          {getApiErrorMessage(query.error, "Instructor profile not found.")}
        </p>
      ) : null}
      {profile ? (
        <div className="grid gap-5">
          <CommunityHeader
            title={profile.displayName || profile.username}
            subtitle={profile.homeLocationLabel || "Verified instructor"}
            action={
              <Badge variant="secondary">
                <BadgeCheck />
                Verified Instructor
              </Badge>
            }
          />
          {profile.bio ? (
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {profile.bio}
            </p>
          ) : null}
          <div className="divide-y divide-border/70 border-y border-border/70">
            {certifications.map((certification) => (
              <div
                key={certification.id}
                className="flex items-center gap-2 py-3"
              >
                <Award className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {certification.agency === "other"
                    ? certification.agencyOtherName
                    : instructorAgencyLabels[certification.agency]}{" "}
                  {certification.certificationLevel}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </CommunityPageShell>
  );
}
