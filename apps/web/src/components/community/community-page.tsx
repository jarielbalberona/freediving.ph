"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

type CommunityStat = {
  label: string;
  value: string;
  icon?: ReactNode;
};

export function CommunityPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-gradient-to-b from-background to-muted/20 px-3 py-3 text-foreground sm:px-4 sm:py-4">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

export function CommunityHeader({
  eyebrow,
  title,
  subtitle,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0 space-y-3">
        <Badge
          variant="outline"
          className="border-border/60 bg-background text-muted-foreground"
        >
          {eyebrow}
        </Badge>
        <div>
          <h1 className="max-w-2xl text-lg font-medium tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
            {subtitle}
          </p>
        </div>
        {children}
      </div>
      {action ? <div className="flex sm:justify-end">{action}</div> : null}
    </header>
  );
}

export function CommunityStats({ items }: { items: CommunityStat[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 rounded-xl border border-border/55 bg-background/70 px-2.5 py-2"
        >
          <div className="flex min-w-0 items-center gap-1 text-[10px] font-medium text-muted-foreground">
            {item.icon}
            <span className="min-w-0 truncate">{item.label}</span>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function CommunityBrowseToolbar({
  label,
  title,
  description,
  children,
}: {
  label?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1.5">
        {label ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
            {label}
          </div>
        ) : null}
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children ? <div className="w-full">{children}</div> : null}
    </div>
  );
}

export function CommunityEmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-background/55 px-4 py-4">
      <div className="flex items-start gap-3">
        {icon ? (
          <div className="shrink-0 text-muted-foreground">{icon}</div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs leading-5 text-muted-foreground">
            {description}
          </p>
          {action ? <div className="pt-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function CommunityAccessNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/45 px-3 py-2 text-xs leading-5 text-muted-foreground">
      {children}
    </div>
  );
}
