"use client";

import type { AdminListParams, AdminPagination } from "@freediving.ph/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { AuthGuard, RequireRole } from "@/components/auth/guard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/http/api-error";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin/buddies", label: "Buddies" },
  { href: "/admin/dive-sites", label: "Dive Sites" },
  { href: "/admin/groups", label: "Groups" },
  { href: "/admin/instructors", label: "Instructors" },
];

export function AdminAccess({ children }: { children: ReactNode }) {
  return (
    <AuthGuard
      requiredRole="ADMIN"
      title="Super admin access required"
      description="This area is restricted to the platform owner."
    >
      <RequireRole
        roles={["super_admin"]}
        title="Super admin access required"
        description="This area is restricted to the platform owner."
      >
        {children}
      </RequireRole>
    </AuthGuard>
  );
}

export function useAdminListParams(): AdminListParams {
  const searchParams = useSearchParams();
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const limit = parsePositiveInt(searchParams.get("limit"), 10);
  return { page, limit };
}

export function AdminPageShell({
  title,
  description,
  total,
  children,
}: {
  title: string;
  description: string;
  total?: number;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {ADMIN_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {typeof total === "number" ? (
          <Badge variant="outline" className="h-7 px-3">
            {total.toLocaleString()} total
          </Badge>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function AdminTable({
  columns,
  gridClassName,
  isLoading,
  error,
  emptyLabel,
  children,
}: {
  columns: string[];
  gridClassName: string;
  isLoading: boolean;
  error: unknown;
  emptyLabel: string;
  children: ReactNode;
}) {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load admin records</AlertTitle>
        <AlertDescription>
          {getApiErrorMessage(error, "The admin list could not be loaded.")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div
            className={cn(
              "grid gap-4 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase text-muted-foreground",
              gridClassName,
            )}
          >
            {columns.map((column) => (
              <div key={column}>{column}</div>
            ))}
          </div>
          {isLoading ? (
            <div className="space-y-0">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "grid gap-4 border-b px-4 py-3 last:border-b-0",
                    gridClassName,
                  )}
                >
                  {columns.map((column) => (
                    <Skeleton key={column} className="h-5 w-full rounded-md" />
                  ))}
                </div>
              ))}
            </div>
          ) : children ? (
            children
          ) : (
            <div className="px-4 py-8 text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminTableRow({
  gridClassName,
  children,
}: {
  gridClassName: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-4 border-b px-4 py-3 text-sm last:border-b-0",
        gridClassName,
      )}
    >
      {children}
    </div>
  );
}

export function AdminPager({ pagination }: { pagination?: AdminPagination }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!pagination) return null;

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    params.set("limit", String(pagination.limit || 10));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!pagination.hasPrev}
          onClick={() => goToPage(Math.max(1, pagination.page - 1))}
        >
          <ChevronLeft />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!pagination.hasNext}
          onClick={() => goToPage(pagination.page + 1)}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

export function DateCell({ value }: { value: string }) {
  return (
    <span className="text-muted-foreground">
      {value ? new Date(value).toLocaleDateString() : "-"}
    </span>
  );
}

export function SmallMuted({ children }: { children: ReactNode }) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
