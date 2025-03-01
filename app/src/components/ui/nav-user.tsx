"use client";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  User
} from "lucide-react";
import { useProfile } from "@/hooks/react-queries/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import useCsrf from "@/hooks/use-csrf";
import { useLogout } from "@/hooks/react-queries/auth";

export function NavUser({initialData}: any) {
  const { isMobile } = useSidebar();
  const queryClient = useQueryClient()
  const csrfToken = useCsrf();
  const router = useRouter();

  const { data: user }: any = useProfile(initialData);

  const successCallback = () => {
    queryClient.setQueryData(["profile"], undefined); // ✅ Instantly update UI
    queryClient.removeQueries({ queryKey: ["profile"] }); // 🚀 Ensure it's cleared
    queryClient.invalidateQueries({ queryKey: ["profile"] }); // 🔄 Trigger refetch if needed
    router.push("/");
  };

  const logoutMutation = useLogout(successCallback);

  return (
    <SidebarMenu>
      <SidebarMenuItem>

        {user?.id ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="w-8 h-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-sm leading-tight text-left">
                  <span className="font-semibold truncate">{user.name}</span>
                  <span className="text-xs truncate">{user.username}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="w-8 h-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-sm leading-tight text-left">
                    <span className="font-semibold truncate">{user.name}</span>
                    <span className="text-xs truncate">{user.username}</span>
                    <span className="text-xs truncate">{user.alias}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <BadgeCheck />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CreditCard />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logoutMutation.mutate(csrfToken)}
              >
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) :
          (
 <SidebarMenuButton asChild>
                          <a href="/auth" className="p-6">
<User />
                            <span  className="text-base">Login</span>
                          </a>
                        </SidebarMenuButton>
          )
        }
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
