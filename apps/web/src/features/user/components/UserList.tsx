"use client";

import { useUsers } from '../hooks';
import { UserCard } from './UserCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, UserPlus } from 'lucide-react';
import type { UserFilters } from '../types';

interface UserListProps {
  filters?: UserFilters;
  showInviteButton?: boolean;
  onUserView?: (userId: number) => void;
  onUserMessage?: (userId: number) => void;
}

export function UserList({
  filters,
  showInviteButton = false,
  onUserView,
  onUserMessage
}: UserListProps) {
  const { data, isLoading, error } = useUsers(filters);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load users. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const users = data ?? [];

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          No users found
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {filters?.search ? 'Try adjusting your search criteria.' : 'No users are currently available.'}
        </p>
        {showInviteButton && (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Users
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onViewProfile={onUserView}
          onSendMessage={onUserMessage}
          showActions={!!onUserView || !!onUserMessage}
        />
      ))}
    </div>
  );
}
