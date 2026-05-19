"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";

import { ThreadActions, useChikaRealtime, useThreads } from "@/features/chika";
import type { ChikaThreadView } from "@/features/chika";
import { useSession } from "@/features/auth/session/use-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatarDetail } from "@/components/ui/user-avatar-detail";

const toRelativeTime = (value: string) => {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return "just now";

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return `${Math.floor(diffMs / day)}d ago`;
};

const ThreadListClient = ({
  initialThreads,
  error,
}: {
  initialThreads: ChikaThreadView[] | null;
  error?: string | null;
}) => {
  const session = useSession();
  const { data: threads, isLoading } = useThreads(initialThreads || undefined);
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
        <div className="mb-4 text-sm text-destructive">{error}</div>
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
          <Card
            key={thread.id}
            className={`mb-3 p-4 transition-colors hover:bg-accent/30 ${thread.isHidden ? "border-dashed opacity-60" : ""}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatarDetail username={thread.authorDisplayName} />
                <p className="truncate text-xs text-muted-foreground">
                  {thread.categoryName} · {toRelativeTime(thread.createdAt)}
                </p>
              </div>
              <div className="shrink-0">
                {thread.categoryPseudonymous ? (
                  <Badge
                    variant="secondary"
                    className="text-[10px] uppercase tracking-wide"
                  >
                    Anon
                  </Badge>
                ) : null}
                {thread.isHidden ? (
                  <Badge
                    variant="destructive"
                    className="ml-2 text-[10px] uppercase tracking-wide"
                  >
                    Hidden
                  </Badge>
                ) : null}
              </div>
            </div>

            <Link href={`/chika/${thread.id}`} className="block">
              <h2 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-foreground">
                {thread.title}
              </h2>

              {thread.content ? (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {thread.content}
                </p>
              ) : null}
            </Link>
            {session.status === "signed_in" ? (
              <div className="mt-3">
                <ThreadActions
                  threadId={thread.id}
                  initialVoteCount={thread.voteCount}
                  initialReaction={thread.userReaction}
                  commentCount={thread.commentCount}
                />
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Preview only. Sign in to react, comment, or start your own
                Chika.
              </p>
            )}
          </Card>
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
