"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ManagementPageContainerVariant = "default" | "wide" | "full" | "form";

const MANAGEMENT_PAGE_WIDTHS: Record<ManagementPageContainerVariant, string> = {
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
  form: "max-w-3xl",
} as const;

export function ManagementPageContainer({
  variant = "default",
  children,
  className,
}: {
  variant?: ManagementPageContainerVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-full bg-gradient-to-b from-background to-muted/20 px-3 py-3 text-foreground sm:px-4 sm:py-4">
      <div
        className={cn(
          "mx-auto flex w-full flex-col gap-4",
          MANAGEMENT_PAGE_WIDTHS[variant],
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
