"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HomeFeedMode } from "@freediving.ph/types";

const modes: Array<{ id: HomeFeedMode; label: string; hint: string }> = [
  { id: "following", label: "For you", hint: "People and plans" },
  { id: "nearby", label: "Near me", hint: "Local updates" },
  { id: "training", label: "Training", hint: "Community progress" },
  { id: "spot-reports", label: "Conditions", hint: "Recent spot reports" },
];

export function FeedModeTabs({
  mode,
  onChange,
}: {
  mode: HomeFeedMode;
  onChange: (mode: HomeFeedMode) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {modes.map((entry) => (
        <Button
          key={entry.id}
          type="button"
          variant={mode === entry.id ? "default" : "outline"}
          onClick={() => onChange(entry.id)}
          className={cn(
            "h-auto min-h-11 rounded-3xl px-4 py-2 text-left text-sm font-medium",
            mode === entry.id && "shadow",
          )}
        >
          <span className="flex flex-col items-start leading-tight">
            <span>{entry.label}</span>
            <span
              className={cn(
                "text-[11px] font-normal text-muted-foreground",
                mode === entry.id && "text-primary-foreground/80",
              )}
            >
              {entry.hint}
            </span>
          </span>
        </Button>
      ))}
    </div>
  );
}
