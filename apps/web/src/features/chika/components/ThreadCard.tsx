import type { ChikaThreadView } from "../api/threads";
import { UserIdentityHeader } from "@/components/common/UserIdentityHeader";
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
          <h3 className="text-lg font-semibold text-foreground">
            {thread.title}
          </h3>
          {thread.categoryPseudonymous ? (
            <Badge variant="secondary" className="text-xs">
              Anonymous
            </Badge>
          ) : null}
          {thread.isHidden ? (
            <Badge variant="destructive" className="text-xs">
              Hidden
            </Badge>
          ) : null}
        </div>
        <UserIdentityHeader
          displayName={thread.authorDisplayName}
          username={thread.authorDisplayName}
          avatarUrl={thread.authorAvatarUrl}
          showProfileImage={!thread.categoryPseudonymous}
          usernameDisabled={thread.categoryPseudonymous}
          time={new Date(thread.createdAt).toLocaleString()}
          className="mt-3"
        />
      </CardContent>
    </Card>
  );
}
