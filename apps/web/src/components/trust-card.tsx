"use client";

import { BadgeCheck, ShieldAlert, Smartphone, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type TrustCardProps = {
  emailVerified?: boolean;
  phoneVerified?: boolean;
  certLevel?: string;
  buddyCount?: number;
  reportCount?: number;
  className?: string;
};

export function TrustCard({
  emailVerified = false,
  phoneVerified = false,
  certLevel,
  buddyCount = 0,
  reportCount = 0,
  className,
}: TrustCardProps) {
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {emailVerified ? (
          <Badge variant="secondary" className="gap-1">
            <BadgeCheck className="h-3 w-3" />
            Email verified
          </Badge>
        ) : null}
        {phoneVerified ? (
          <Badge variant="secondary" className="gap-1">
            <Smartphone className="h-3 w-3" />
            Phone verified
          </Badge>
        ) : null}
        {certLevel ? <Badge variant="outline">{certLevel}</Badge> : null}
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />
          {buddyCount} buddies
        </Badge>
        <Badge variant="outline" className="gap-1">
          <ShieldAlert className="h-3 w-3" />
          {reportCount} reports
        </Badge>
      </div>
    </div>
  );
}
