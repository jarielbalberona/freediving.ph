import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { serverAPICall } from "@/lib/api";
import { redirect } from "next/navigation";
import AuthForm from "./form"

export default async function AuthPage() {
  const session:any = await serverAPICall("/auth/session")
  if (session?.status !== 401 && session?.status !== 403) {
    // bug, wont redirect to home if authenticated already and tried to access login page
    redirect("/"); // Redirect to home page
  }


  return (
    <div className="flex flex-col flex-1 min-h-full px-6 py-12 mt-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="mb-4">
          <Image
            alt="Your Company"
            src="/images/freedivingph-blue-transparent.png"
            width={400}
            height={400}
            className="w-auto h-10 mx-auto"
          />
        </div>
        <Tabs defaultValue="account" className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="account">Sign in</TabsTrigger>
            <TabsTrigger value="password">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <AuthForm isSignIn={true} />
          </TabsContent>
          <TabsContent value="password">
            <AuthForm isSignIn={false} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
