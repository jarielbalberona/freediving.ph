"use client";

import {
  Award,
  CheckCircle2,
  CreditCard,
  CalendarClock,
  FileSpreadsheet,
  LayoutDashboard,
  MessageSquare,
  Settings2,
  Users,
  Handshake,
  QrCode,
  ChevronsUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useEvent } from "@/features/events";
import { useEvents } from "@/features/events/hooks/queries";
import { ManagementWorkspaceShell } from "@/components/layout/management-workspace-shell";
import { useSession } from "@/features/auth/session";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const eventWorkspaceNavItems = [
  { label: "Overview", hrefSuffix: "", icon: LayoutDashboard },
  { label: "Setup", hrefSuffix: "/setup", icon: CheckCircle2 },
  { label: "Participants", hrefSuffix: "/participants", icon: Users },
  { label: "Join Form", hrefSuffix: "/join-form", icon: FileSpreadsheet },
  { label: "Program", hrefSuffix: "/program", icon: MessageSquare },
  { label: "Payments", hrefSuffix: "/payments", icon: CreditCard },
  { label: "Posts", hrefSuffix: "/posts", icon: MessageSquare },
  { label: "Awards", hrefSuffix: "/awards", icon: Award },
  { label: "Sponsors", hrefSuffix: "/sponsors", icon: Handshake },
  { label: "Check-in", hrefSuffix: "/check-in", icon: QrCode },
  { label: "Settings", hrefSuffix: "/settings", icon: Settings2 },
];

export function EventManagementShell({
  slug,
  children,
  isLoadingState,
  emptyState,
}: {
  slug: string;
  children: React.ReactNode;
  isLoadingState?: React.ReactNode;
  emptyState?: React.ReactNode;
}) {
  const session = useSession();
  const managedEventsQuery = useEvents(undefined, session.status === "signed_in");
  const manageableEvents =
    managedEventsQuery.data?.events?.filter((event) => event.viewerCanManage) ?? [];
  const eventQuery = useEvent(slug);
  const event = eventQuery.data;
  const isMobile = useIsMobile();

  if (eventQuery.isLoading) {
    return (
      <ManagementWorkspaceShell
        switcher={
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-8 w-full justify-between gap-2 px-2"
              >
                <div className="flex aspect-square size-7 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <CalendarClock className="size-3.5" />
                </div>
                <div className="grid flex-1 min-w-0 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Loading event workspace</span>
                  <span className="truncate text-xs text-muted-foreground">Event</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        }
        navItems={[]}
        backHref="/management/events"
        backLabel="Back to events"
      >
        {isLoadingState ?? (
          <div className="rounded-xl border border-dashed p-4">Loading event.</div>
        )}
      </ManagementWorkspaceShell>
    );
  }

  if (!event || eventQuery.isError) {
    return (
      <ManagementWorkspaceShell
        switcher={
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-8 w-full justify-between gap-2 px-2"
              >
                <div className="flex aspect-square size-7 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <CalendarClock className="size-3.5" />
                </div>
                <div className="grid flex-1 min-w-0 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Event workspace</span>
                  <span className="truncate text-xs text-muted-foreground">Event</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        }
        navItems={[]}
        backHref="/management/events"
        backLabel="Back to events"
      >
        {emptyState ?? (
          <div className="rounded-xl border border-dashed p-4">
            Unable to open this event workspace right now.
          </div>
        )}
      </ManagementWorkspaceShell>
    );
  }

  const navItems = eventWorkspaceNavItems.map((item) => ({
    label: item.label,
    href: `/management/events/${encodeURIComponent(event.slug)}${item.hrefSuffix}`,
    icon: item.icon,
  }));
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
                <div className="flex aspect-square size-7 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <CalendarClock className="size-3.5 shrink-0" />
                </div>
                <div className="grid flex-1 min-w-0 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{event.title}</span>
                  <span className="truncate text-xs text-muted-foreground">Event</span>
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
                Events
              </DropdownMenuLabel>
              {manageableEvents.length > 0 ? (
                manageableEvents
                  .slice(0, 24)
                  .map((item) => {
                    const isCurrent = item.slug === event.slug;
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        disabled={isCurrent}
                        className="gap-2 p-2"
                        onClick={() =>
                          !isCurrent &&
                          router.push(`/management/events/${encodeURIComponent(item.slug)}`)
                        }
                      >
                        <div className="flex size-6 items-center justify-center rounded-md border">
                          <CalendarClock className="size-3.5 shrink-0" />
                        </div>
                        {item.title}
                      </DropdownMenuItem>
                    );
                  })
              ) : (
                <DropdownMenuItem disabled>No manageable events found.</DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => router.push("/management/events")}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <CalendarClock className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">View all events</div>
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
      backHref="/management/events"
      backLabel="Back to events"
    >
      {children}
    </ManagementWorkspaceShell>
  );
}
