import { Suspense } from "react";

import { ExploreLayout } from "@/features/explore/components/ExploreLayout";

export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreFallback />}>
      <ExploreLayout />
    </Suspense>
  );
}

function ExploreFallback() {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-[720px] items-center justify-center bg-background px-4">
      <p className="text-sm text-muted-foreground">Loading explore map...</p>
    </div>
  );
}
