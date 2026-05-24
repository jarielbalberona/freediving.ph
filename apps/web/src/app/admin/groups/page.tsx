"use client";

import type { AdminGroup } from "@freediving.ph/types";
import { Archive, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminArchiveGroup,
  useAdminGroups,
  useAdminUpdateGroup,
} from "@/features/admin";
import { getApiErrorMessage } from "@/lib/http/api-error";

const GRID = "grid-cols-[minmax(260px,2fr)_120px_120px_170px_120px_110px]";

export default function AdminGroupsPage() {
  return (
    <AdminAccess>
      <AdminGroupsContent />
    </AdminAccess>
  );
}

function AdminGroupsContent() {
  const params = useAdminListParams();
  const query = useAdminGroups(params);
  const items = query.data?.items ?? [];
  const pagination = query.data?.pagination;
  const updateGroupMutation = useAdminUpdateGroup();
  const archiveGroupMutation = useAdminArchiveGroup();
  const [editingGroup, setEditingGroup] = useState<AdminGroup | null>(null);
  const [editName, setEditName] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "private">(
    "public",
  );
  const [editJoinPolicy, setEditJoinPolicy] = useState<"open" | "invite_only">(
    "open",
  );
  const isPrivateEdit = editVisibility === "private";

  useEffect(() => {
    if (isPrivateEdit && editJoinPolicy !== "invite_only") {
      setEditJoinPolicy("invite_only");
    }
  }, [editJoinPolicy, isPrivateEdit]);

  const openEdit = (group: AdminGroup) => {
    setEditingGroup(group);
    setEditName(group.name);
    setEditVisibility(group.visibility);
    setEditJoinPolicy(
      group.visibility === "private" ? "invite_only" : group.joinPolicy,
    );
  };

  const onUpdateGroup = async () => {
    if (!editingGroup) return;
    try {
      await updateGroupMutation.mutateAsync({
        groupId: editingGroup.id,
        data: {
          name: editName.trim(),
          visibility: editVisibility,
          joinPolicy: isPrivateEdit ? "invite_only" : editJoinPolicy,
        },
      });
      toast.success("Group updated.");
      setEditingGroup(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update group"));
    }
  };

  const onArchiveGroup = async (group: AdminGroup) => {
    try {
      await archiveGroupMutation.mutateAsync({ groupId: group.id });
      toast.success("Group archived.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to archive group"));
    }
  };

  return (
    <AdminPageShell
      title="Admin Groups"
      description="All groups across public, private, active, archived, and deleted states."
      total={pagination?.total}
    >
      <AdminTable
        columns={[
          "Group",
          "Visibility",
          "Status",
          "Activity",
          "Created",
          "Actions",
        ]}
        gridClassName={GRID}
        isLoading={query.isLoading}
        error={query.error}
        emptyLabel="No groups found."
      >
        {items.length > 0
          ? items.map((group) => (
              <AdminTableRow key={group.id} gridClassName={GRID}>
                <div className="min-w-0">
                  <div className="truncate font-medium">{group.name}</div>
                  <SmallMuted>{group.slug}</SmallMuted>
                </div>
                <Badge variant="outline">{label(group.visibility)}</Badge>
                <Badge
                  variant={
                    group.status === "active" ? "secondary" : "destructive"
                  }
                >
                  {label(group.status)}
                </Badge>
                <div>
                  <span>{group.memberCount} members</span>
                  <SmallMuted>
                    {" "}
                    / {group.eventCount} events / {group.postCount} posts
                  </SmallMuted>
                </div>
                <DateCell value={group.createdAt} />
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Edit ${group.name}`}
                    tooltip="Edit group"
                    onClick={() => openEdit(group)}
                  >
                    <Pencil />
                  </Button>
                  <ArchiveGroupButton
                    group={group}
                    isPending={archiveGroupMutation.isPending}
                    onArchive={() => void onArchiveGroup(group)}
                  />
                </div>
              </AdminTableRow>
            ))
          : null}
      </AdminTable>
      <AdminPager pagination={pagination} />
      <Dialog
        open={Boolean(editingGroup)}
        onOpenChange={(open) => {
          if (!open) setEditingGroup(null);
        }}
      >
        <DialogContent className="sm:max-w-lg!">
          <DialogHeader>
            <DialogTitle>Edit group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-group-name">Name</Label>
              <Input
                id="admin-group-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Visibility</Label>
                <Select
                  value={editVisibility}
                  onValueChange={(value) =>
                    setEditVisibility(value as "public" | "private")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Join policy</Label>
                <Select
                  value={editJoinPolicy}
                  disabled={isPrivateEdit}
                  onValueChange={(value) =>
                    setEditJoinPolicy(value as "open" | "invite_only")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isPrivateEdit ? null : (
                      <SelectItem value="open">Open join</SelectItem>
                    )}
                    <SelectItem value="invite_only">Invite only</SelectItem>
                  </SelectContent>
                </Select>
                {isPrivateEdit ? (
                  <SmallMuted>Private groups are invite-only.</SmallMuted>
                ) : null}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              Cancel
            </Button>
            <Button
              disabled={updateGroupMutation.isPending}
              onClick={() => void onUpdateGroup()}
            >
              {updateGroupMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}

function ArchiveGroupButton({
  group,
  isPending,
  onArchive,
}: {
  group: AdminGroup;
  isPending: boolean;
  onArchive: () => void;
}) {
  const disabled = isPending || group.status !== "active";
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={disabled}
            aria-label={`Archive ${group.name}`}
            tooltip={
              group.status === "active" ? "Archive group" : "Already archived"
            }
          />
        }
      >
        <Archive />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive group?</AlertDialogTitle>
          <AlertDialogDescription>
            This hides {group.name} from public group discovery. The group
            record stays available in admin.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onArchive}>
            {isPending ? "Archiving..." : "Archive group"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function label(value: string) {
  return value.replace(/_/g, " ");
}
