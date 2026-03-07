"use client";

import { useNotifications, useMarkAllAsRead } from '../hooks';
import { NotificationCard } from './NotificationCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, CheckCircle } from 'lucide-react';
import type { NotificationFilters } from '@freediving.ph/types';

interface NotificationListProps {
  filters?: NotificationFilters;
}

export function NotificationList({ filters }: NotificationListProps) {
  const { data, isLoading, error } = useNotifications(filters);
  const markAllAsReadMutation = useMarkAllAsRead();

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load notifications. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const notifications = data ?? [];
  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No notifications
        </h3>
        <p className="text-sm text-muted-foreground">
          You're all caught up! New notifications will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between p-4 bg-info/10 rounded-lg border border-info/30">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-info" />
            <span className="text-sm font-medium text-info-foreground">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            className="border-info/40 text-info-foreground hover:bg-info/20"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
          />
        ))}
      </div>
    </div>
  );
}
