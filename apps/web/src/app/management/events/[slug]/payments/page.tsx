import { EventPaymentMethodsManageClient } from "../../../../events/[slug]/client-page";
import { EventManagementShell } from "@/features/events/components/event-management-shell";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  return (
    <EventManagementShell slug={slug}>
      <EventPaymentMethodsManageClient slug={slug} />
    </EventManagementShell>
  );
}
