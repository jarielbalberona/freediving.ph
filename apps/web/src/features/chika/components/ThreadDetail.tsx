import type { ChikaThreadView } from "../api/threads";
import { UsernameLink } from "@/components/common/UsernameLink";
import { ReportAction } from "@/components/report/report-action";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ThreadActions from "./ThreadActions";
import { ChikaMarkdown } from "./ChikaMarkdown";

interface ThreadDetailProps {
  thread: ChikaThreadView;
}

export default function ThreadDetail({ thread }: ThreadDetailProps) {
  return (
    <Card
      className={`p-4 ${thread.isHidden ? "border-dashed opacity-60" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {thread.categoryName} ·{" "}
          <UsernameLink
            username={thread.authorDisplayName}
            disabled={thread.categoryPseudonymous}
          />{" "}
          · {new Date(thread.createdAt).toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          {thread.categoryPseudonymous ? (
            <Badge
              variant="secondary"
              className="text-[10px] uppercase tracking-wide"
            >
              Anonymous
            </Badge>
          ) : null}
          {thread.isHidden ? (
            <Badge
              variant="destructive"
              className="text-[10px] uppercase tracking-wide"
            >
              Hidden
            </Badge>
          ) : null}
        </div>
      </div>

      <h1 className="text-xl font-semibold leading-snug text-foreground">
        {thread.title}
      </h1>

      {thread.content ? (
        <ChikaMarkdown content={thread.content} className="mt-3" />
      ) : null}

      {thread.isHidden && thread.hiddenAt ? (
        <p className="mt-2 text-xs text-destructive">
          Hidden since {new Date(thread.hiddenAt).toLocaleString()}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ThreadActions
          threadId={thread.id}
          initialVoteCount={thread.voteCount}
          initialReaction={thread.userReaction}
          commentCount={thread.commentCount}
        />
        <ReportAction targetType="chika_thread" targetId={thread.id} />
      </div>
    </Card>
  );
}
