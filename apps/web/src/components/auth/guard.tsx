"use client";

import type { ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import type { GlobalRole, PermissionFlag } from "@freediving.ph/config";

import { useSession } from "@/features/auth/session";
import { hasRequiredRole, type AppRole } from "@/lib/auth/roles";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type GuardProps = {
  children: ReactNode;
  requiredRole?: AppRole;
  title?: string;
  description?: string;
};

type RoleGuardProps = GuardProps & {
  roles: GlobalRole[];
};

type PermissionGuardProps = GuardProps & {
  perm: PermissionFlag;
};

const mapGlobalRoleToAppRole = (role: GlobalRole | undefined): AppRole => {
  if (!role) return "GUEST";
  if (role === "admin" || role === "super_admin") return "ADMIN";
  if (role === "moderator") return "MODERATOR";
  return "MEMBER";
};

const Blocked = ({ title, description }: { title: string; description: string }) => (
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

export function AuthGuard({
  children,
  requiredRole = "MEMBER",
  title = "Account required",
  description = "Create an account to access this page."
}: GuardProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const session = useSession();

  const isSessionLoading = !isLoaded || session.status === "loading";
  const shouldRedirectToSignIn =
    session.status === "signed_out" || (isLoaded && !user);

  useEffect(() => {
    if (shouldRedirectToSignIn) {
      router.replace("/sign-in");
    }
  }, [router, shouldRedirectToSignIn]);

  if (shouldRedirectToSignIn) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }

  if (isSessionLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }

  if (!session.me) {
    return (
      <Blocked
        title={title}
        description={description}
      />
    );
  }

  const appRole = mapGlobalRoleToAppRole(session.me.globalRole);
  if (!hasRequiredRole(appRole, requiredRole)) {
    return <Blocked title="Access denied" description="Your role does not allow access to this page." />;
  }

  return <>{children}</>;
}

export function RequireRole({
  children,
  roles,
  title = "Access denied",
  description = "Your role does not allow access to this page."
}: RoleGuardProps) {
  const session = useSession();
  const role = session.me?.globalRole;

  if (session.status === "loading") {
    return null;
  }

  if (!role || !roles.includes(role)) {
    return <Blocked title={title} description={description} />;
  }

  return <>{children}</>;
}

export function RequirePermission({
  children,
  perm,
  title = "Access denied",
  description = "You do not have the required permission for this action."
}: PermissionGuardProps) {
  const session = useSession();

  if (session.status === "loading") {
    return null;
  }

  if (!session.hasPermission(perm)) {
    return <Blocked title={title} description={description} />;
  }

  return <>{children}</>;
}
