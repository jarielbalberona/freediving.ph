import { MessagingView } from "@/features/messages/components";

type PageProps = {
  params: Promise<{ threadId: string }>;
};

export default async function MessageThreadPage({ params }: PageProps) {
  const { threadId } = await params;
  return <MessagingView threadId={threadId} />;
}
