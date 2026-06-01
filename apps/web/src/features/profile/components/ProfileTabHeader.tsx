"use client";

import type { ReactNode } from "react";

type ProfileTabHeaderProps = {
  id?: string;
  title: string;
  subtitle: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function ProfileTabHeader({
  id,
  title,
  subtitle,
  icon,
  action,
}: ProfileTabHeaderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon ? <div className="text-muted-foreground">{icon}</div> : null}
          <h2
            id={id}
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
    </div>
  );
}
