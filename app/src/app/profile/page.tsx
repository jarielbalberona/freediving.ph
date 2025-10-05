import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ProfileView from "@/components/profile/profile-view";

export default async function Profile() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <ProfileView />
  );
}

