import type { Metadata } from "next";

import { GroupManagementWorkspacePage } from "@/features/groups/components/group-management-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "Group management | Freediving Philippines",
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return <GroupManagementWorkspacePage slug={slug} />;
}
