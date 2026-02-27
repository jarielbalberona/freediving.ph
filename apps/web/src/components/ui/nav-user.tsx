"use client";
import { User } from "lucide-react";
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import {
  SidebarMenu,
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
          <div className="w-full">
            <SignInButton mode="modal">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <User />
                <span className="text-base">Sign In</span>
              </button>
            </SignInButton>
          </div>
        </SignedOut>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
