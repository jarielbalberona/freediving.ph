import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";

import ReactQueryProvider from "@/providers/react-query";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig, META_THEME_COLORS } from "@/config/site";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { MobileNavWithDrawers } from "@/components/nav/mobile-nav-with-drawers";
import { DesktopCreateFab } from "@/components/nav/desktop-create-fab";
import { AuthGate } from "@/features/auth/auth-gate";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ModeSwitcher } from "@/components/ui/mode-switcher";
import { NotificationCenter } from "@/components/nav/notification-center";
import { NavUser } from "@/components/ui/nav-user";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLogo } from "@/components/ui/app-logo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const googleSiteVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
const googleAnalyticsId = "G-2ML3MWBFD8";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  metadataBase: new URL(siteConfig.url),
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 5000,
        height: 2625,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  verification: googleSiteVerification
    ? {
        google: googleSiteVerification,
      }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: META_THEME_COLORS.light,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}');
              `,
            }}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  if (localStorage.theme === 'dark' || ((!('theme' in localStorage) || localStorage.theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.querySelector('meta[name="theme-color"]').setAttribute('content', '${META_THEME_COLORS.dark}')
                  }
                } catch (_) {}
              `,
            }}
          />
        </head>
        <body
          className={cn(
            "bg-background overscroll-none font-sans antialiased",
            inter.variable,
          )}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ReactQueryProvider>
              <TooltipProvider>
                <SidebarProvider defaultOpen={defaultOpen}>
                  <AppSidebar />
                  <SidebarInset>
                    <AuthGate />
                    <header className="sticky inset-x-0 top-0 z-10 flex items-center gap-2 bg-background isolate shrink-0">
                      <div className="flex items-center w-full gap-2 px-4 h-14">
                        <div className="flex items-center gap-2">
                          <SidebarTrigger className="-ml-1.5" />
                          <AppLogo />
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <ModeSwitcher />
                          <NotificationCenter />
                          <NavUser />
                        </div>
                      </div>
                    </header>
                    <div className="pb-17 md:pb-0 min-h-[calc(100vh-3.5rem)]">
                      {children}
                    </div>
                  </SidebarInset>
                  <MobileNavWithDrawers />
                  <DesktopCreateFab />
                </SidebarProvider>
              </TooltipProvider>
              <Toaster />
            </ReactQueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

export const dynamic = "force-dynamic";
