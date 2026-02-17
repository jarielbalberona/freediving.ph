"use client";

import type { ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { hasRequiredRole, normalizeRole, type AppRole } from "@/lib/auth/roles";

type GuardProps = {
  children: ReactNode;
  requiredRole?: AppRole;
  title?: string;
  description?: string;
};

export function AuthGuard({
  children,
  requiredRole = "MEMBER",
  title = "Sign in required",
  description = "You need to sign in to access this page.",
}: GuardProps) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent>
            <div className="py-12 text-center">
              <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-muted-foreground">{description}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userRole = normalizeRole(
    (user.publicMetadata?.role as string | undefined) ?? (user.unsafeMetadata?.role as string | undefined)
  );

  if (!hasRequiredRole(userRole, requiredRole)) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent>
            <div className="py-12 text-center">
              <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Access denied</h2>
              <p className="text-muted-foreground">Your role does not allow access to this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
