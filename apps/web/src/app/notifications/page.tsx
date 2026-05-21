"use client";

import { NotificationList } from '@/features/notifications';
import {
  useNotificationSettings,
  useNotificationStats,
} from '@/features/notifications';
import { useUpdateNotificationSettings } from '@/features/notifications/hooks/mutations';
import { AuthGuard } from '@/components/auth/guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FeatureErrorBoundary } from '@/components/error-boundary';
import { Bell, Calendar, MessageSquare } from 'lucide-react';

export default function NotificationsPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useNotificationStats();
  const settingsQuery = useNotificationSettings();
  const updateSettingsMutation = useUpdateNotificationSettings();
  const newDiveSiteEnabled =
    settingsQuery.data?.newDiveSitePublished ?? true;
  const chikaRepliesEnabled = settingsQuery.data?.chikaReplies ?? true;

  const handleToggleNewDiveSites = () => {
    updateSettingsMutation.mutate({
      newDiveSitePublished: !newDiveSiteEnabled,
    });
  };

  const handleToggleChikaReplies = () => {
    updateSettingsMutation.mutate({
      chikaReplies: !chikaRepliesEnabled,
    });
  };

  return (
    <AuthGuard title="Sign in to view notifications" description="Please sign in to access your notifications.">
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated with your latest activities and messages.
            </p>
          </div>

          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            statsError ? (
              <Card>
                <CardContent className="py-6">
                  <p className="text-sm text-destructive">
                    Unable to load notification stats.
                  </p>
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
                    <div className="text-2xl font-bold text-destructive">
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
                    <div className="text-2xl font-bold text-success">
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
                    <div className="text-2xl font-bold text-muted-foreground">
                      {stats?.archived || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Stored away</p>
                  </CardContent>
                </Card>
              </div>
            )
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Explore Notifications</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  New approved dive-site announcements are sent in-app.
                </p>
              </div>
              <Badge variant={newDiveSiteEnabled ? "default" : "secondary"}>
                {newDiveSiteEnabled ? "Enabled" : "Off"}
              </Badge>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Receive a bell notification when a newly approved public dive
                site is added to Explore.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleToggleNewDiveSites}
                disabled={settingsQuery.isLoading || updateSettingsMutation.isPending}
              >
                {newDiveSiteEnabled ? "Turn off" : "Turn on"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Chika Replies</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Comments and replies on your Chika activity are sent in-app.
                </p>
              </div>
              <Badge variant={chikaRepliesEnabled ? "default" : "secondary"}>
                {chikaRepliesEnabled ? "Enabled" : "Off"}
              </Badge>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Receive a bell notification when someone comments on your Chika
                thread or replies to your comment.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleToggleChikaReplies}
                disabled={settingsQuery.isLoading || updateSettingsMutation.isPending}
              >
                {chikaRepliesEnabled ? "Turn off" : "Turn on"}
              </Button>
            </CardContent>
          </Card>

          <FeatureErrorBoundary featureName="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <NotificationList />
              </CardContent>
            </Card>
          </FeatureErrorBoundary>
        </div>
      </div>
    </AuthGuard>
  );
}
