"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HomeFeedMode } from "@freediving.ph/types";

const modes: Array<{ id: HomeFeedMode; label: string }> = [
  { id: "following", label: "Following" },
  { id: "nearby", label: "Nearby" },
  { id: "training", label: "Training" },
  { id: "spot-reports", label: "Spot reports" },
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
          className={cn("h-9 rounded-full px-4 text-sm font-medium", mode === entry.id && "shadow")}
        >
          {entry.label}
        </Button>
      ))}
    </div>
  );
}
