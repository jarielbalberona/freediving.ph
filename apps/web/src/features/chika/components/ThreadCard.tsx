import type { ChikaThreadView } from "../api/threads";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ThreadCardProps {
  thread: ChikaThreadView;
}

export default function ThreadCard({ thread }: ThreadCardProps) {
  return (
    <Card className={thread.isHidden ? "border-dashed opacity-60" : ""}>
      <CardContent className="p-6">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">{thread.title}</h3>
          {thread.categoryPseudonymous ? (
            <Badge variant="secondary" className="text-xs">Anonymous</Badge>
          ) : null}
          {thread.isHidden ? (
            <Badge variant="destructive" className="text-xs">Hidden</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {thread.authorDisplayName}
          <span className="mx-2">·</span>
          <span>{new Date(thread.createdAt).toLocaleString()}</span>
        </p>
        {thread.realAuthorUserId ? (
          <p className="mt-1 text-xs text-muted-foreground/70">
            Real author: {thread.realAuthorUserId}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

