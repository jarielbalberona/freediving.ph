import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers"
import { Geist, Geist_Mono } from "next/font/google";

import { cn } from "@/lib/utils"
import { Analytics } from "@/components/analytics"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { siteConfig, META_THEME_COLORS } from "@/config/site"
import { AppSidebar } from "@/components/ui/app-sidebar"
import { NavHeader } from "@/components/ui/nav-header"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ModeSwitcher } from "@/components/ui/mode-switcher"

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  metadataBase: new URL(siteConfig.url),
  description: siteConfig.description,
};

export const viewport: Viewport = {
  themeColor: META_THEME_COLORS.light,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
          geistSans.variable,
          geistMono.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* {children} */}
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <SidebarInset>
              <header className="bg-background sticky inset-x-0 top-0 isolate z-10 flex shrink-0 items-center gap-2 border-b">
                <div className="flex h-14 w-full items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1.5" />
                  <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                  />
                  <NavHeader />
                  <div className="ml-auto flex items-center gap-2">
                    <ModeSwitcher />
                  </div>
                </div>
              </header>
              {children}
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
