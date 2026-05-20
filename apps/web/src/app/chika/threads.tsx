"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";

import { useChikaRealtime, useThreads } from "@/features/chika";
import { useSession } from "@/features/auth/session/use-session";
import { Button } from "@/components/ui/button";
import { ChikaPostComponent } from "@/features/chika/components/ChikaPostComponent";
import { chikaPostFromThread } from "@/features/chika/types/post-display";

const ThreadListClient = () => {
  const session = useSession();
  const { data: threads, error, isLoading } = useThreads();
  useChikaRealtime({ enabled: true, currentUserId: session.me?.userId });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-5">
        <p className="text-sm font-medium text-foreground">
          Opening the community board
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Chika is where divers ask questions, share local updates, and keep the
          conversation going between dives.
        </p>
      </div>
    );
  }

  const threadList = threads ?? [];

  return (
    <>
      {error ? (
        <div className="mb-4 text-sm text-destructive">
          Chika is having trouble loading right now.
        </div>
      ) : null}
      {threadList.length === 0 ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 px-6 py-12 text-center">
          <p className="text-lg font-semibold text-foreground">
            Start the first Chika
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask about a dive spot, invite buddies for a session, or share a
            local freediving update.
          </p>
          <div className="mt-5">
            {session.status === "signed_in" ? (
              <Link href="/chika/create">
                <Button>Post in Chika</Button>
              </Link>
            ) : (
              <SignInButton mode="modal">
                <Button>Sign in to join Chika</Button>
              </SignInButton>
            )}
          </div>
        </div>
      ) : (
        threadList.map((thread) => (
          <ChikaPostComponent
            key={thread.id}
            post={chikaPostFromThread(thread)}
            actions={
              session.status === "signed_in" ? null : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Preview only. Sign in to react, comment, or start your own
                  Chika.
                </p>
              )
            }
          />
        ))
      )}
      {session.status !== "signed_in" && threadList.length > 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-center">
          <p className="text-sm font-medium">Showing a public preview.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in to react, comment, or start a Chika of your own.
          </p>
        </div>
      ) : null}
    </>
  );
};

export default ThreadListClient;
