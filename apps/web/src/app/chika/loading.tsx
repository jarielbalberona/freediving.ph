export default function ChikaLoading() {
  return (
    <main>
      <div className="xl:pr-96">
        <div className="px-4 py-10 sm:px-6 lg:px-8 lg:py-6">
          <div className="container mx-auto max-w-screen-lg px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="space-y-0" aria-label="Loading Chika posts">
              {Array.from({ length: 4 }).map((_, index) => (
                <article
                  key={`chika-route-loading-${index + 1}`}
                  className="border-b border-border/70 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-52 max-w-full animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                    <div className="h-6 w-20 shrink-0 animate-pulse rounded-full bg-muted" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-full animate-pulse rounded bg-muted" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-7 w-24 animate-pulse rounded-full bg-muted" />
                    <div className="h-7 w-16 animate-pulse rounded-full bg-muted" />
                    <div className="h-7 w-16 animate-pulse rounded-full bg-muted" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
