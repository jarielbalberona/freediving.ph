"use client";
import { User } from "lucide-react";
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

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
          <SidebarMenuButton asChild>
            <SignInButton mode="modal">
              <div className="flex items-center gap-2 p-6">
                <User />
                <span className="text-base">Sign In</span>
              </div>
            </SignInButton>
          </SidebarMenuButton>
        </SignedOut>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
