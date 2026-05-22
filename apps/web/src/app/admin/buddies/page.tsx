"use client";

import Link from "next/link";

import {
  AdminAccess,
  AdminPageShell,
  AdminPager,
  AdminTable,
  AdminTableRow,
  DateCell,
  SmallMuted,
  useAdminListParams,
} from "@/app/admin/_components/admin-page";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAdminProfiles } from "@/features/admin";

const GRID = "grid-cols-[minmax(280px,2fr)_140px_130px_180px_120px]";

export default function AdminBuddiesPage() {
  return (
    <AdminAccess>
      <AdminBuddiesContent />
    </AdminAccess>
  );
}

function AdminBuddiesContent() {
  const params = useAdminListParams();
  const query = useAdminProfiles(params);
  const items = query.data?.items ?? [];
  const pagination = query.data?.pagination;

  return (
    <AdminPageShell
      title="Admin Buddies"
      description="All member profiles in the platform account base."
      total={pagination?.total}
    >
      <AdminTable
        columns={["Profile", "Role", "Status", "Signals", "Created"]}
        gridClassName={GRID}
        isLoading={query.isLoading}
        error={query.error}
        emptyLabel="No profiles found."
      >
        {items.length > 0
          ? items.map((profile) => (
              <AdminTableRow key={profile.userId} gridClassName={GRID}>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar>
                    {profile.avatarUrl ? (
                      <AvatarImage
                        src={profile.avatarUrl}
                        alt={profile.displayName}
                      />
                    ) : null}
                    <AvatarFallback>
                      {initials(profile.displayName || profile.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <Link
                      href={`/profile/${profile.username}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {profile.displayName || profile.username}
                    </Link>
                    <SmallMuted>@{profile.username}</SmallMuted>
                  </div>
                </div>
                <Badge variant="outline">{label(profile.globalRole)}</Badge>
                <Badge
                  variant={
                    profile.accountStatus === "active"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {label(profile.accountStatus)}
                </Badge>
                <div className="text-sm">
                  <span>{profile.buddyCount} buddies</span>
                  <SmallMuted> / {profile.reportCount} reports</SmallMuted>
                </div>
                <DateCell value={profile.createdAt} />
              </AdminTableRow>
            ))
          : null}
      </AdminTable>
      <AdminPager pagination={pagination} />
    </AdminPageShell>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function label(value: string) {
  return value.replace(/_/g, " ");
}
