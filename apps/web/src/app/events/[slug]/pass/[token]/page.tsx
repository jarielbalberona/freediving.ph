import { EventPassVerificationClient } from "../../client-page";

type PageProps = {
  params: Promise<{ slug: string; token: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return {
    title: "Event pass | Freediving Philippines",
    alternates: {
      canonical: `/events/${encodeURIComponent(slug)}/pass`,
    },
  };
}

export default async function EventPassPage({ params }: PageProps) {
  const { slug, token } = await params;
  return <EventPassVerificationClient slug={slug} token={token} />;
}
