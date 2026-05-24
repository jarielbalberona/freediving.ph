import { SignIn } from "@clerk/nextjs";
import { headers } from "next/headers";
import { InAppBrowserAuthGuard } from "@/components/auth/in-app-browser-auth-guard";
import { getInAppBrowserName } from "@/lib/auth/in-app-browser";

export default async function SignInPage() {
  const userAgent = (await headers()).get("user-agent") ?? "";
  const initialBrowserName = getInAppBrowserName(userAgent);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <InAppBrowserAuthGuard initialBrowserName={initialBrowserName}>
        <SignIn />
      </InAppBrowserAuthGuard>
    </div>
  );
}
