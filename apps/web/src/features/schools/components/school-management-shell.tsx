"use client";

import {
  Building2,
  CalendarDays,
  BookOpen,
  CreditCard,
  GraduationCap,
  ChevronsUpDown,
  Settings2,
  Users,
  Wallet,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useManageSchools } from "@/features/schools/hooks/queries";
import { ManagementWorkspaceShell } from "@/components/layout/management-workspace-shell";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { School } from "@freediving.ph/types";

const schoolWorkspaceNavItems = [
  {
    label: "Overview",
    value: "overview",
    hrefSuffix: "",
    icon: Building2,
  },
  {
    label: "Profile",
    value: "profile",
    hrefSuffix: "/profile",
    icon: CalendarDays,
  },
  {
    label: "Courses",
    value: "courses",
    hrefSuffix: "/courses",
    icon: BookOpen,
  },
  {
    label: "Sessions",
    value: "sessions",
    hrefSuffix: "/sessions",
    icon: GraduationCap,
  },
  {
    label: "Bookings",
    value: "bookings",
    hrefSuffix: "/bookings",
    icon: CreditCard,
  },
  {
    label: "Instructors",
    value: "instructors",
    hrefSuffix: "/instructors",
    icon: Users,
  },
  {
    label: "Payments",
    value: "payments",
    hrefSuffix: "/payments",
    icon: Wallet,
  },
  {
    label: "Settings",
    value: "settings",
    hrefSuffix: "/settings",
    icon: Settings2,
  },
];

export function SchoolManagementShell({
  school,
  children,
  emptyState,
}: {
  school: School;
  children: React.ReactNode;
  emptyState?: React.ReactNode;
}) {
  const managedSchoolsQuery = useManageSchools();
  const managedSchools = managedSchoolsQuery.data ?? [];
  const canSwitch = managedSchools.length > 1;
  const isMobile = useIsMobile();
  const router = useRouter();

  const navItems = schoolWorkspaceNavItems.map((item) => ({
    label: item.label,
    href: `/management/schools/${encodeURIComponent(school.slug)}${item.hrefSuffix}`,
    icon: item.icon,
  }));

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
                  <Building2 className="size-3.5" />
                </div>
                <div className="grid flex-1 min-w-0 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{school.name}</span>
                  <span className="truncate text-xs text-muted-foreground">School</span>
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
                Schools
              </DropdownMenuLabel>
              {managedSchools.slice(0, 24).map((item, index) => {
                const isCurrent = item.slug === school.slug;
                return (
                  <DropdownMenuItem
                    key={item.id}
                    disabled={isCurrent}
                    className="gap-2 p-2"
                    onClick={() =>
                      !isCurrent &&
                      router.push(`/management/schools/${encodeURIComponent(item.slug)}`)
                    }
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <Building2 className="size-3.5 shrink-0" />
                    </div>
                    {item.name}
                    {!isCurrent ? (
                      <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                    ) : null}
                  </DropdownMenuItem>
                );
              })}
              {managedSchools.length === 0 ? (
                <DropdownMenuItem disabled>Loading managed schools</DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => router.push("/management/schools")}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">View all schools</div>
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
      backHref="/management/schools"
      backLabel="Back to schools"
      containerVariant="wide"
    >
      {canSwitch || !managedSchoolsQuery.isLoading ? emptyState : null}
      {children}
    </ManagementWorkspaceShell>
  );
}
