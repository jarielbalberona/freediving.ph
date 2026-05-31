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
import { EntityAvatar } from "@/components/common/entity-media";
import { EntityLogoCoverSettings } from "@/features/media/components";
import { useUpdateSchool } from "@/features/schools/hooks/mutations";
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
  const updateSchool = useUpdateSchool(school.slug);

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
                <EntityAvatar
                  src={school.logoUrl}
                  label={school.name}
                  icon={Building2}
                  className="size-7 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
                  fallbackClassName="text-sidebar-primary-foreground"
                />
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
                    <EntityAvatar
                      src={item.logoUrl}
                      label={item.name}
                      icon={Building2}
                      className="size-6 rounded-md"
                    />
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
      <EntityLogoCoverSettings
        title="School images"
        logoUrl={school.logoUrl}
        logoMediaId={school.logoMediaId}
        coverUrl={school.coverUrl}
        coverMediaId={school.coverMediaId}
        logoContext="school_logo"
        coverContext="school_cover"
        contextId={school.id}
        disabled={school.currentUserRole !== "owner"}
        isSaving={updateSchool.isPending}
        onSave={(data) => updateSchool.mutateAsync(data)}
      />
      {children}
    </ManagementWorkspaceShell>
  );
}
