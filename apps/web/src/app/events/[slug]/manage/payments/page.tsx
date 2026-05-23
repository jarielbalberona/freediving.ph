import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

import { EventPaymentMethodsManageClient } from "../../client-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const eventPaymentsManageUrl = (slug: string) =>
  `${siteConfig.url}/events/${encodeURIComponent(slug)}/manage/payments`;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "Manage event payments | Freediving Philippines",
    alternates: { canonical: eventPaymentsManageUrl(slug) },
  };
}

export default async function EventPaymentMethodsManagePage({
  params,
}: PageProps) {
  const { slug } = await params;
  return <EventPaymentMethodsManageClient slug={slug} />;
}
