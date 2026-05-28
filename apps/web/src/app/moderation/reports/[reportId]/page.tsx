import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ reportId: string }>;
};

export default async function Page({ params }: PageProps) {
  const { reportId } = await params;
  redirect(`/admin/moderation/reports/${encodeURIComponent(reportId)}`);
}
