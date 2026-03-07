"use client";
import { User } from "lucide-react";
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function NavUser() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SignedIn>
          <div className="flex items-center justify-center p-2">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 rounded-lg"
                }
              }}
            />
          </div>
        </SignedIn>
        <SignedOut>
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
        </SignedOut>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
