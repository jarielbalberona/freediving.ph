"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/auth/guard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      title="Sign in to publish photos"
      description="Only signed-in members can post photos on their own profile."
    >
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {!isOwner ? (
          <Card>
            <CardHeader>
              <CardTitle>Profile mismatch</CardTitle>
              <CardDescription>
                You can only create photo posts on your own profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
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
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Create a photo post
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                Upload up to 10 photos, choose an FPH dive site, write per-photo
                captions, then publish them as one grouped post.
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
    </AuthGuard>
  );
}
