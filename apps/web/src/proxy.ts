import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/messages(.*)",
  "/notifications(.*)",
  "/media(.*)",
  "/chika/create(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/messages/:path*",
    "/notifications/:path*",
    "/media/:path*",
    "/chika/create/:path*",
  ],
};
