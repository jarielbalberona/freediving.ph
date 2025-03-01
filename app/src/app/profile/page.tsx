import { redirect } from "next/navigation";
import { serverAPICall } from "@/lib/api";
import ProfileView from "@/components/profile/profile-view";
import { cookies } from "next/headers";

export default async function Profile() {
  const cookieStore = await cookies();
  const profile: any = await serverAPICall("/auth/me", {
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieStore.toString()
    },
    credentials: "include", // Include cookies
  });
  if (profile?.status === 401 || profile?.status === 403) {
      redirect("/auth"); // Redirect to login page
    }
  return (
    <ProfileView initialData={profile?.data || {}} />
  );
}

