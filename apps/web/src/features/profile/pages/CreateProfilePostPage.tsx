"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/auth/guard";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { ProfileMediaComposer } from "@/features/media/components/ProfileMediaComposer";
import { getProfileRoute, normalizeUsername } from "@/lib/routes";

type CreateProfilePostPageProps = {
  username: string;
};

export default function CreateProfilePostPage({
  username,
}: CreateProfilePostPageProps) {
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

  return (
    <AuthGuard
      title="Sign in to publish media"
      description="Only signed-in members can post media on their own profile."
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
                  You can only create posts on your own profile.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {normalizedViewerUsername ? (
                  <Button
                    type="button"
                    onClick={() =>
                      router.replace(`/${normalizedViewerUsername}/create`)
                    }
                  >
                    Go to my create page
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.push(getProfileRoute(normalizedTargetUsername))
                  }
                >
                  Back to profile
                </Button>
              </div>
            </section>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <h1 className="text-lg font-medium tracking-tight text-foreground">
                  Create a post
                </h1>
                <p className="max-w-xl text-xs leading-5 text-muted-foreground">
                  Share dive photos or a short Moment from your profile.
                </p>
              </div>

              <ProfileMediaComposer
                username={normalizedTargetUsername}
                onPublished={() => {
                  router.replace(getProfileRoute(normalizedTargetUsername));
                }}
              />
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
