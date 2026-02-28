"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Lock } from "lucide-react";
import { getMainNavItems, isActiveRoute } from "@/config/nav";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useCurrentProfileHref } from "@/features/profile/hooks/use-current-profile-href";
import { cn } from "@/lib/utils";

type BottomNavProps = {
  onOpenCreate: () => void;
};

export function BottomNav({ onOpenCreate }: BottomNavProps) {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const effectiveSignedIn = mounted && isLoaded && isSignedIn;
  const profileHref = useCurrentProfileHref();

  const mainItems = getMainNavItems({ isSignedIn: effectiveSignedIn ?? false });

  const handleItemClick = (item: (typeof mainItems)[number]) => {
    if (item.kind === "action") {
      if (item.actionId === "create") onOpenCreate();
      if (item.actionId === "more") setOpenMobile(true);
      return;
    }
    if (item.kind === "link" && item.isProtected && !effectiveSignedIn) {
      router.push("/auth");
      return;
    }
  };

  return (
    <nav
      className="bg-background border-sidebar-border fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main navigation"
    >
      {mainItems.map((item) => {
        const href = item.id === "profile" ? profileHref : item.href ?? "#";
        const active =
          item.kind === "link" &&
          isActiveRoute(pathname ?? "", href);
        const isProtectedLink =
          item.kind === "link" && item.isProtected && !effectiveSignedIn;

        if (item.kind === "action") {
          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex min-w-0 flex-1 flex-col items-center justify-center py-5 transition-colors rounded-none h-auto"
              aria-label={item.title}
              onClick={() => {
                if (item.actionId === "create") onOpenCreate();
                if (item.actionId === "more") setOpenMobile(true);
              }}
            >
              {item.icon != null && (
                <item.icon className="size-6 shrink-0" aria-hidden />
              )}
            </Button>
          );
        }

        if (isProtectedLink) {
          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex min-w-0 flex-1 flex-col items-center justify-center py-5 transition-colors rounded-none h-auto"
              aria-label={`${item.title} (sign in required)`}
              title="Sign in to access"
              onClick={() => handleItemClick(item)}
            >
              <span className="relative inline-block">
                {item.icon != null && (
                  <item.icon className="size-6 shrink-0" aria-hidden />
                )}
                <Lock className="absolute -right-1.5 -top-0.5 size-3 shrink-0 opacity-80" aria-hidden />
              </span>
            </Button>
          );
        }

        return (
          <Link
            key={item.id}
            href={href}
            className={cn(
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex min-w-0 flex-1 flex-col items-center justify-center py-5 transition-colors",
              active && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            )}
            aria-current={active ? "page" : undefined}
            aria-label={item.title}
          >
            {item.icon != null && (
              <item.icon className="size-6 shrink-0" aria-hidden />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
