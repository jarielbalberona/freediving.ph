"use client";
import { User } from "lucide-react";
import { UserButton, SignInButton, useAuth } from "@clerk/nextjs";
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function NavUser() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center justify-center p-2">
            <div className="h-8 w-8 rounded-lg bg-muted/30" />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {isSignedIn ? (
          <div className="flex items-center justify-center p-2">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 rounded-lg",
                },
              }}
            />
          </div>
        ) : (
          <div className="w-full">
            <SignInButton mode="modal">
              <Button
                size="sm"
                tooltip="Sign in to your account"
              >
                <User />
                <span>Sign In</span>
              </Button>
            </SignInButton>
          </div>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
