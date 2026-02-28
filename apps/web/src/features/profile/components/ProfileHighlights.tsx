import Image from "next/image";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { PublicProfileHighlight } from "@/features/profile/types";

type ProfileHighlightsProps = {
  highlights: PublicProfileHighlight[];
};

const fallbackHighlights = Array.from({ length: 8 }, (_, index) => ({
  id: `profile-highlight-fallback-${index + 1}`,
  title: `Spot ${index + 1}`,
  coverUrl: `/images/samples/${(index % 13) + 1}.jpg`,
}));

export function ProfileHighlights({
  highlights,
}: ProfileHighlightsProps) {
  const items = highlights.length > 0 ? highlights : fallbackHighlights;

  return (
    <ScrollArea className="w-full">
      <div className="flex min-w-full gap-4 px-1 py-1">
        {items.map((highlight) => (
          <div
            key={highlight.id}
            className="flex w-20 shrink-0 flex-col items-center gap-2"
          >
            <div className="rounded-full border border-border p-1">
              <div className="relative size-[4.5rem] overflow-hidden rounded-full bg-muted sm:size-20">
                <Image
                  src={highlight.coverUrl || "/images/samples/1.jpg"}
                  alt={highlight.title}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            </div>
            <span className="line-clamp-1 max-w-full text-center text-xs font-medium text-foreground">
              {highlight.title}
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
