import { ThreadWithUser } from '@freediving.ph/types';
import { getRemovedContentLabel, isRemovedContent } from '@/lib/content/moderation';
import { Card, CardContent } from '@/components/ui/card';

interface ThreadDetailProps {
  thread: ThreadWithUser;
}

export default function ThreadDetail({ thread }: ThreadDetailProps) {
  if (!thread) {
    return <h1>Thread not found</h1>;
  }
  const isRemoved = isRemovedContent(thread.thread.content) || isRemovedContent(thread.thread.title);
  const removedLabel = getRemovedContentLabel(thread.thread.content) ?? getRemovedContentLabel(thread.thread.title);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4">
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            {isRemoved ? "Content unavailable" : thread.thread.title}
          </h1>
          <div className="mb-4 flex items-center text-sm text-muted-foreground">
            <span>By {thread.user.alias || thread.user.username}</span>
            <span className="mx-2">•</span>
            <span>{new Date(thread.thread.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap text-foreground">
            {isRemoved ? removedLabel || "This content has been removed." : thread.thread.content}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>{thread.upvotes - thread.downvotes} likes</span>
            <span>{thread.commentCount} comments</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
