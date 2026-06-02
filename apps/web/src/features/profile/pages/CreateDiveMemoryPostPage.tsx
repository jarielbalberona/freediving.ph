"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/auth/guard";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { DiveMemoryMediaComposer } from "@/features/profile/components/DiveMemoryMediaComposer";
import { useProfileDiveMemoriesPageQuery } from "@/features/profile/hooks/queries";
import {
  getDiveMemoriesRoute,
  getProfileRoute,
  normalizeUsername,
} from "@/lib/routes";

type CreateDiveMemoryPostPageProps = {
  username: string;
  entrySlug: string;
};

export default function CreateDiveMemoryPostPage({
  username,
  entrySlug,
}: CreateDiveMemoryPostPageProps) {
  const router = useRouter();
  const session = useSession();
  const { user } = useUser();
  const viewerUsername = session.me?.username ?? user?.username ?? null;
  const normalizedTargetUsername = normalizeUsername(username);
  const normalizedViewerUsername = viewerUsername
    ? normalizeUsername(viewerUsername)
    : null;
  const isOwner =
    normalizedViewerUsername != null &&
    normalizedViewerUsername === normalizedTargetUsername;
  const pageHref = getDiveMemoriesRoute(normalizedTargetUsername, entrySlug);
  const pageQuery = useProfileDiveMemoriesPageQuery(
    normalizedTargetUsername,
    entrySlug,
    Boolean(normalizedTargetUsername && entrySlug),
  );

  return (
    <AuthGuard
      title="Sign in to publish media"
      description="Only signed-in members can post media on their own dive page."
    >
      <div className="min-h-full bg-gradient-to-b from-background to-muted/20 px-3 py-3 text-foreground sm:px-4 sm:py-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {!isOwner ? (
            <section className="space-y-4 rounded-xl border border-border/70 bg-background/70 p-4">
              <div className="space-y-1">
                <h1 className="text-lg font-medium tracking-tight text-foreground">
                  Profile mismatch
                </h1>
                <p className="text-xs leading-5 text-muted-foreground">
                  You can only create posts on your own dive page.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {normalizedViewerUsername ? (
                  <Button
                    type="button"
                    onClick={() =>
                      router.replace(
                        `${getProfileRoute(normalizedViewerUsername)}?tab=dive-memories`,
                      )
                    }
                  >
                    Go to my Dive Memories
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(pageHref)}
                >
                  Back to dive page
                </Button>
              </div>
            </section>
          ) : pageQuery.isPending && !pageQuery.data ? (
            <section className="space-y-1 rounded-xl border border-border/70 bg-background/70 p-4">
              <h1 className="text-lg font-medium tracking-tight text-foreground">
                Create a memory
              </h1>
              <p className="text-xs leading-5 text-muted-foreground">
                Loading dive location context.
              </p>
            </section>
          ) : pageQuery.isError || !pageQuery.data ? (
            <section className="space-y-4 rounded-xl border border-border/70 bg-background/70 p-4">
              <div className="space-y-1">
                <h1 className="text-lg font-medium tracking-tight text-foreground">
                  Dive page unavailable
                </h1>
                <p className="text-xs leading-5 text-muted-foreground">
                  We couldn&apos;t load this dive location for posting.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(pageHref)}
              >
                Back to dive page
              </Button>
            </section>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <h1 className="text-lg font-medium tracking-tight text-foreground">
                  Create a memory
                </h1>
                <p className="max-w-xl text-xs leading-5 text-muted-foreground">
                  Share any photos from this stop, even if they are food, group
                  shots, or travel moments during this trip.
                </p>
              </div>

              <DiveMemoryMediaComposer
                username={normalizedTargetUsername}
                diveSiteId={pageQuery.data.site.diveSiteId}
                diveSiteLabel={`${pageQuery.data.site.name} · ${pageQuery.data.site.area}`}
                onCancel={() => {
                  router.push(pageHref);
                }}
                onPublished={() => {
                  router.replace(pageHref);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
