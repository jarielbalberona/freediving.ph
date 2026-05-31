"use client";

import { ChevronsUpDown, LayoutDashboard, MessageCircleMore, Settings2, UserRound, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import type { Group } from "@freediving.ph/types";
import { EntityAvatar } from "@/components/common/entity-media";
import { ManagementWorkspaceShell } from "@/components/layout/management-workspace-shell";
import { useSession } from "@/features/auth/session";
import { useUpdateGroup } from "@/features/groups/hooks/mutations";
import { useUserGroups } from "@/features/groups/hooks/queries";
import { EntityLogoCoverSettings } from "@/features/media/components";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const groupWorkspaceNavItems = [
  { label: "Overview", hrefSuffix: "", icon: LayoutDashboard },
  { label: "Profile", hrefSuffix: "/profile", icon: UserRound },
  { label: "Members", hrefSuffix: "/members", icon: Users },
  { label: "Posts", hrefSuffix: "/posts", icon: MessageCircleMore },
  { label: "Settings", hrefSuffix: "/settings", icon: Settings2 },
];

export function GroupManagementShell({
  group,
  children,
}: {
  group: Group;
  children: React.ReactNode;
}) {
  const session = useSession();
  const manageableGroupsQuery = useUserGroups(
    1,
    24,
    session.status === "signed_in",
  );
  const manageableGroups = manageableGroupsQuery.data?.groups ?? [];
  const updateGroup = useUpdateGroup();
  const navItems = groupWorkspaceNavItems.map((item) => ({
    label: item.label,
    href: `/management/groups/${encodeURIComponent(group.slug)}${item.hrefSuffix}`,
    icon: item.icon,
  }));
  const isMobile = useIsMobile();
  const router = useRouter();

  const switcher = (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-8 w-full justify-between gap-2 px-2"
              >
                <EntityAvatar
                  src={group.logoUrl}
                  label={group.name}
                  icon={Users}
                  className="size-7 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
                  fallbackClassName="text-sidebar-primary-foreground"
                />
                <div className="grid flex-1 min-w-0 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{group.name}</span>
                  <span className="truncate text-xs text-muted-foreground">Group</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Groups
              </DropdownMenuLabel>
              {manageableGroupsQuery.isLoading ? (
                <DropdownMenuItem disabled>Loading groups...</DropdownMenuItem>
              ) : null}

              {manageableGroups.length > 0 ? (
                manageableGroups
                  .slice(0, 24)
                  .map((item) => {
                    const isCurrent = item.slug === group.slug;
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        disabled={isCurrent}
                        className="gap-2 p-2"
                        onClick={() =>
                          !isCurrent &&
                          router.push(
                            `/management/groups/${encodeURIComponent(item.slug)}`,
                          )
                        }
                      >
                        <EntityAvatar
                          src={item.logoUrl}
                          label={item.name}
                          icon={Users}
                          className="size-6 rounded-md"
                        />
                        {item.name}
                      </DropdownMenuItem>
                    );
                  })
              ) : (
                <DropdownMenuItem disabled>No manageable groups found.</DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => router.push("/management/groups")}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Users className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">View all groups</div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );

  return (
    <ManagementWorkspaceShell
      switcher={switcher}
      navItems={navItems}
      backHref="/management/groups"
      backLabel="Back to groups"
    >
      <EntityLogoCoverSettings
        title="Group images"
        logoUrl={group.logoUrl}
        logoMediaId={group.logoMediaId}
        coverUrl={group.coverUrl}
        coverMediaId={group.coverMediaId}
        logoContext="group_logo"
        coverContext="group_cover"
        contextId={group.id}
        disabled={group.viewerRole !== "owner" && group.viewerRole !== "moderator"}
        isSaving={updateGroup.isPending}
        onSave={(data) =>
          updateGroup.mutateAsync({
            groupId: group.id,
            data,
          })
        }
      />
      {children}
    </ManagementWorkspaceShell>
  );
}
