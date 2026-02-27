import type { ChikaThreadView } from "../api/threads";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ThreadDetailProps {
  thread: ChikaThreadView;
}

export default function ThreadDetail({ thread }: ThreadDetailProps) {
  return (
    <Card className={thread.isHidden ? "border-dashed opacity-60" : ""}>
      <CardContent className="p-6">
        <div className="mb-2 flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">{thread.title}</h1>
          {thread.categoryPseudonymous ? (
            <Badge variant="secondary" className="text-xs">Anonymous</Badge>
          ) : null}
          {thread.isHidden ? (
            <Badge variant="destructive" className="text-xs">Hidden</Badge>
          ) : null}
        </div>
        <div className="text-sm text-muted-foreground">
          <span>{thread.authorDisplayName}</span>
          <span className="mx-2">·</span>
          <span>{new Date(thread.createdAt).toLocaleString()}</span>
          {thread.categoryName ? (
            <>
              <span className="mx-2">·</span>
              <span>{thread.categoryName}</span>
            </>
          ) : null}
        </div>
        {thread.realAuthorUserId ? (
          <p className="mt-1 text-xs text-muted-foreground/70">
            Real author: {thread.realAuthorUserId}
          </p>
        ) : null}
        {thread.isHidden && thread.hiddenAt ? (
          <p className="mt-2 text-xs text-destructive">
            Hidden since {new Date(thread.hiddenAt).toLocaleString()}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

