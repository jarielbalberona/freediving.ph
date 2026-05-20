import { Suspense } from "react";

import { MessagingView } from "@/features/messages/components";

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesFallback />}>
      <MessagingView threadId={null} />
    </Suspense>
  );
}

function MessagesFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Loading messages...</p>
    </div>
  );
}
