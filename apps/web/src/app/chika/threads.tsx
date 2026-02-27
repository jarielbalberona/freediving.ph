"use client";

import Link from "next/link";

import { useThreads } from "@/features/chika";
import type { ChikaThreadView } from "@/features/chika";
import { Badge } from "@/components/ui/badge";

const ThreadListClient = ({
  initialThreads,
  error,
}: {
  initialThreads: ChikaThreadView[] | null;
  error?: string | null;
}) => {
  const { data: threads, isLoading } = useThreads(initialThreads || undefined);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading threads...</div>;
  }

  return (
    <>
      {error ? <div className="mb-4 text-sm text-destructive">{error}</div> : null}
      {(threads ?? []).map((thread) => (
        <Link
          key={thread.id}
          href={`/chika/${thread.id}`}
          className={`mb-2 block rounded-lg bg-card p-4 transition-colors hover:bg-accent ${thread.isHidden ? "border border-dashed opacity-60" : ""}`}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{thread.title}</h2>
            {thread.categoryPseudonymous ? (
              <Badge variant="secondary" className="text-xs">Anon</Badge>
            ) : null}
            {thread.isHidden ? (
              <Badge variant="destructive" className="text-xs">Hidden</Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {thread.authorDisplayName} · {new Date(thread.createdAt).toLocaleString()}
          </p>
        </Link>
      ))}
    </>
  );
};

export default ThreadListClient;
