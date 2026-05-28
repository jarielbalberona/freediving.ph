import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/management/schools/${encodeURIComponent(slug)}/bookings`);
}
