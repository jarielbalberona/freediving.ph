"use client";

import { useUser } from '@clerk/nextjs';
import { useGroups, useUserGroups } from '@/features/groups';
import { AuthGuard } from '@/components/auth/guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErrorBoundary, FeatureErrorBoundary } from '@/components/error-boundary';
import {
  Users,
  Plus,
  Search,
  Filter,
  MapPin,
  Calendar,
  MessageSquare,
  Settings
} from 'lucide-react';
import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/http/api-error';
import { getNumericUserId } from '@/lib/auth/user-id';

export default function GroupsPage() {
  const { user, isLoaded } = useUser();
  const numericUserId = getNumericUserId(user);
  const [activeTab, setActiveTab] = useState('all');

  const { data: allGroups, isLoading: allGroupsLoading, error: allGroupsError } = useGroups({
    page: 1,
    limit: 20
  });

  const { data: userGroups, isLoading: userGroupsLoading, error: userGroupsError } = useUserGroups(
    numericUserId ?? 0,
    1,
    20
  );

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PUBLIC':
        return 'default';
      case 'PRIVATE':
        return 'secondary';
      case 'INVITE_ONLY':
        return 'outline';
      case 'CLOSED':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const GroupCard = ({ group, showJoinButton = true }: { group: any; showJoinButton?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{group.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={getTypeColor(group.type)}>
                {group.type}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {group.memberCount}
              </div>
            </div>
          </div>
          {showJoinButton && (
            <Button size="sm" variant="outline">
              Join
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {group.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {group.description}
          </p>
        )}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            {group.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {group.location}
              </div>
            )}
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {group.postCount} posts
            </div>
          </div>
          <div className="text-xs">
            Created {new Date(group.createdAt).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AuthGuard title="Sign in to view groups" description="Please sign in to see and join groups.">
      <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Groups</h1>
            <p className="text-muted-foreground">
              Connect with fellow freedivers and join communities.
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search groups..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Groups</TabsTrigger>
            <TabsTrigger value="my">My Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <FeatureErrorBoundary featureName="groups-list">
              {allGroupsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : allGroupsError ? (
                <div className="col-span-full text-center py-8 text-destructive">
                  {getApiErrorMessage(allGroupsError, "Failed to load groups")}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.isArray(allGroups?.data?.data) ? allGroups.data.data.map((group) => (
                    <GroupCard key={group.id} group={group} />
                  )) : (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      No groups found
                    </div>
                  )}
                </div>
              )}
            </FeatureErrorBoundary>
          </TabsContent>

          <TabsContent value="my" className="space-y-4">
            <FeatureErrorBoundary featureName="user-groups">
              {userGroupsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : userGroupsError ? (
                <div className="col-span-full text-center py-8 text-destructive">
                  {getApiErrorMessage(userGroupsError, "Failed to load your groups")}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.isArray(userGroups?.data?.data) ? userGroups.data.data.map((group) => (
                    <GroupCard key={group.id} group={group} showJoinButton={false} />
                  )) : (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      You haven't joined any groups yet
                    </div>
                  )}
                </div>
              )}
            </FeatureErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </AuthGuard>
  );
}
