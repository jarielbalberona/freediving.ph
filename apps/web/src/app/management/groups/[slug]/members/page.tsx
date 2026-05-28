import type { Metadata } from "next";

import { GroupManagementSectionPage } from "@/features/groups/components/group-management-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const metadata: Metadata = {
  title: "Group members | Freediving Philippines",
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  return (
    <GroupManagementSectionPage
      slug={slug}
      title="Group members"
      description="Member management is coming soon in the dedicated group workspace."
    />
  );
}
