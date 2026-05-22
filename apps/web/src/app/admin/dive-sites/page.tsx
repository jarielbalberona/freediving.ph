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
import { Badge } from "@/components/ui/badge";
import { useAdminDiveSites } from "@/features/admin";

const GRID = "grid-cols-[minmax(300px,2fr)_130px_150px_160px_130px]";

export default function AdminDiveSitesPage() {
  return (
    <AdminAccess>
      <AdminDiveSitesContent />
    </AdminAccess>
  );
}

function AdminDiveSitesContent() {
  const params = useAdminListParams();
  const query = useAdminDiveSites(params);
  const items = query.data?.items ?? [];
  const pagination = query.data?.pagination;

  return (
    <AdminPageShell
      title="Admin Dive Sites"
      description="All dive site records, including pending and hidden entries."
      total={pagination?.total}
    >
      <AdminTable
        columns={["Dive Site", "State", "Verification", "Activity", "Updated"]}
        gridClassName={GRID}
        isLoading={query.isLoading}
        error={query.error}
        emptyLabel="No dive sites found."
      >
        {items.length > 0
          ? items.map((site) => (
              <AdminTableRow key={site.id} gridClassName={GRID}>
                <div className="min-w-0">
                  <Link
                    href={`/explore/sites/${site.slug}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {site.name}
                  </Link>
                  <SmallMuted>{site.area}</SmallMuted>
                </div>
                <Badge
                  variant={
                    site.moderationState === "approved"
                      ? "secondary"
                      : site.moderationState === "pending"
                        ? "outline"
                        : "destructive"
                  }
                >
                  {label(site.moderationState)}
                </Badge>
                <div className="space-y-1">
                  <Badge variant="outline">
                    {label(site.verificationStatus)}
                  </Badge>
                  <SmallMuted>{label(site.entryDifficulty)}</SmallMuted>
                </div>
                <div>
                  <span>{site.updateCount} updates</span>
                  <SmallMuted> / {site.likeCount} likes</SmallMuted>
                </div>
                <DateCell value={site.lastUpdatedAt || site.updatedAt} />
              </AdminTableRow>
            ))
          : null}
      </AdminTable>
      <AdminPager pagination={pagination} />
    </AdminPageShell>
  );
}

function label(value: string) {
  return value.replace(/_/g, " ");
}
