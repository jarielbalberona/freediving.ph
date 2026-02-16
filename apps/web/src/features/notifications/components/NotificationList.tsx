"use client";

import { useNotifications, useMarkAllAsRead } from '../hooks';
import { NotificationCard } from './NotificationCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, CheckCircle } from 'lucide-react';
import type { NotificationFilters } from '@freediving.ph/types';

interface NotificationListProps {
  userId: number;
  filters?: NotificationFilters;
}

export function NotificationList({ userId, filters }: NotificationListProps) {
  const { data, isLoading, error } = useNotifications(userId, filters);
  const markAllAsReadMutation = useMarkAllAsRead();

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate(userId);
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
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
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
            userId={userId}
          />
        ))}
      </div>
    </div>
  );
}
