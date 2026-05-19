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
    <div className="min-h-full bg-[linear-gradient(180deg,_hsl(var(--background))_0%,_hsl(var(--muted)/0.22)_100%)] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">{children}</div>
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
    <header className="grid gap-5 border-b border-border/60 pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="space-y-3">
        <Badge className="rounded-full bg-primary text-primary-foreground">
          {eyebrow}
        </Badge>
        <div className="space-y-2">
          <h1 className="max-w-4xl font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl lg:text-[2.6rem]">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
            {subtitle}
          </p>
        </div>
        {children}
      </div>
      {action ? <div className="flex lg:justify-end">{action}</div> : null}
    </header>
  );
}

export function CommunityStats({ items }: { items: CommunityStat[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-border/55 bg-background/70 px-4 py-3"
        >
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {item.icon}
            {item.label}
          </div>
          <p className="mt-2 text-xl font-semibold text-foreground">
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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {label ? (
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            {label}
          </div>
        ) : null}
        <div className="space-y-1">
          <h2 className="font-serif text-2xl tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children ? <div className="w-full lg:w-auto">{children}</div> : null}
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
    <div className="rounded-2xl border border-dashed border-border/70 bg-background/55 px-5 py-6 text-center">
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3">
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </div>
  );
}

export function CommunityAccessNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted/45 px-4 py-3 text-sm leading-6 text-muted-foreground">
      {children}
    </div>
  );
}
