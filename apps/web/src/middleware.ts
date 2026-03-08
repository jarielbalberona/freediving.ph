import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/messages(.*)",
  "/notifications(.*)",
  "/services(.*)",
  "/media(.*)",
  "/chika/create(.*)",
]);

const COMING_SOON_PREFIXES = [
  "/competitive-records",
  "/training-logs",
  "/safety",
  "/awareness",
  "/services",
  "/media",
  "/marketplace",
  "/collaboration",
];

function isComingSoonPath(pathname: string): boolean {
  return COMING_SOON_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (isComingSoonPath(pathname)) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = "/coming-soon";
    nextUrl.search = "";
    return NextResponse.redirect(nextUrl);
  }

  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
