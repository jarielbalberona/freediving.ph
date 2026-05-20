import { Suspense } from "react";

import { HomeFeedPage } from "@/features/home-feed";

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeFeedPage />
    </Suspense>
  );
}

function HomeFallback() {
  return (
    <main className="min-h-full bg-gradient-to-b from-background to-muted/20 px-3 py-3 text-foreground sm:px-4 sm:py-4">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="rounded-lg border border-border bg-muted/30 p-5">
          <p className="text-sm font-medium text-foreground">Loading home</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Finding the latest from the freediving community.
          </p>
        </div>
      </div>
    </main>
  );
}
