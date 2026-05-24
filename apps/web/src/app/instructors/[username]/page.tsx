import type { Metadata } from "next";

import { PublicInstructorPage } from "./client-page";

type PageProps = {
  params: Promise<{ username: string }>;
};

export const metadata: Metadata = {
  title: "Instructor profile | Freediving Philippines",
};

export default async function Page({ params }: PageProps) {
  const { username } = await params;
  return <PublicInstructorPage username={username} />;
}
