"use client";

import { useUser } from '@clerk/nextjs';
import { NotificationList } from '@/features/notifications';
import { useNotificationStats } from '@/features/notifications';
import { AuthGuard } from '@/components/auth/guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FeatureErrorBoundary } from '@/components/error-boundary';
import { Bell, Calendar, MessageSquare } from 'lucide-react';
import { getNumericUserId } from '@/lib/auth/user-id';

export default function NotificationsPage() {
  const { user } = useUser();
  const numericUserId = getNumericUserId(user);
  const { data: stats, isLoading: statsLoading, error: statsError } = useNotificationStats(
    numericUserId ?? 0
  );

  return (
    <AuthGuard title="Sign in to view notifications" description="Please sign in to access your notifications.">
      <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your latest activities and messages.
          </p>
        </div>

        {/* Stats Cards */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          !numericUserId ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                Account setup incomplete. Please refresh and try again.
              </CardContent>
            </Card>
          ) : statsError ? (
            <Card>
              <CardContent className="py-6 text-sm text-destructive">
                Unable to load notification stats.
              </CardContent>
            </Card>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">All notifications</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unread</CardTitle>
                <Badge variant="destructive" className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats?.unread || 0}
                </div>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Read</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.read || 0}
                </div>
                <p className="text-xs text-muted-foreground">Already seen</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Archived</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {stats?.archived || 0}
                </div>
                <p className="text-xs text-muted-foreground">Stored away</p>
              </CardContent>
            </Card>
          </div>
          )
        )}

        {/* Notifications List */}
        <FeatureErrorBoundary featureName="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {numericUserId ? (
                <NotificationList userId={numericUserId} />
              ) : (
                <p className="text-sm text-muted-foreground">Cannot load notifications for this account.</p>
              )}
            </CardContent>
          </Card>
        </FeatureErrorBoundary>
      </div>
      </div>
    </AuthGuard>
  );
}
