"use client";

import { Bell, Clock, CheckCircle, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMarkAsRead, useDeleteNotification } from '../hooks';
import type { Notification } from '@freediving.ph/types';

interface NotificationCardProps {
  notification: Notification;
  userId: number;
}

export function NotificationCard({ notification, userId }: NotificationCardProps) {
  const markAsReadMutation = useMarkAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'destructive';
      case 'NORMAL':
        return 'default';
      case 'LOW':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: Notification['status']) => {
    switch (status) {
      case 'UNREAD':
        return <Bell className="h-4 w-4 text-info" />;
      case 'READ':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'ARCHIVED':
        return <Archive className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const handleMarkAsRead = () => {
    if (notification.status === 'UNREAD') {
      markAsReadMutation.mutate({ userId, notificationId: notification.id });
    }
  };

  const handleDelete = () => {
    deleteNotificationMutation.mutate({ userId, notificationId: notification.id });
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      notification.status === 'UNREAD' ? 'border-l-4 border-l-info bg-info/10' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(notification.status)}
            <CardTitle className="text-sm font-medium">{notification.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getPriorityColor(notification.priority)}>
              {notification.priority}
            </Badge>
            <Badge variant="outline">
              {notification.type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">{notification.message}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(notification.createdAt).toLocaleDateString()}
            </div>
            {notification.readAt && (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Read {new Date(notification.readAt).toLocaleDateString()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {notification.status === 'UNREAD' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAsRead}
                disabled={markAsReadMutation.isPending}
              >
                Mark as Read
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteNotificationMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
