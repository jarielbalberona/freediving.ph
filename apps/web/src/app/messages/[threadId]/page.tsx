import { Suspense } from "react";

import { MessagingView } from "@/features/messages/components";

type PageProps = {
  params: Promise<{ threadId: string }>;
};

export default async function MessageThreadPage({ params }: PageProps) {
  const { threadId } = await params;
  return (
    <Suspense fallback={<MessagesFallback />}>
      <MessagingView threadId={threadId} />
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
