"use client";

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useGroups, useUserGroups, useJoinGroup, useLeaveGroup, useCreateGroup } from '@/features/groups';
import { AuthGuard } from '@/components/auth/guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeatureErrorBoundary } from '@/components/error-boundary';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Plus, Search, Filter, MapPin, MessageSquare } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/http/api-error';
import { toast } from 'sonner';
import type { Group } from '@freediving.ph/types';

export default function GroupsPage() {
  const { isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createLocation, setCreateLocation] = useState('');

  const filters = useMemo(
    () => ({
      page: 1,
      limit: 20,
      search: search || undefined,
    }),
    [search],
  );

  const { data: allGroups, isLoading: allGroupsLoading, error: allGroupsError } = useGroups(filters);
  const { data: userGroups, isLoading: userGroupsLoading, error: userGroupsError } = useUserGroups(1, 20);

  const joinMutation = useJoinGroup();
  const leaveMutation = useLeaveGroup();
  const createMutation = useCreateGroup();

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

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return 'default';
      case 'private':
        return 'secondary';
      case 'invite_only':
        return 'outline';
      default:
        return 'default';
    }
  };

  const myGroupIds = new Set((userGroups?.groups ?? []).map((group) => group.id));

  const GroupCard = ({ group }: { group: Group }) => {
    const joined = myGroupIds.has(group.id);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle>
                <Link href={`/groups/${group.id}`} className="hover:underline">
                  {group.name}
                </Link>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={getVisibilityColor(group.visibility)}>{group.visibility}</Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {group.memberCount}
                </div>
              </div>
            </div>
            {joined ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => leaveMutation.mutate({ groupId: group.id })}
                disabled={leaveMutation.isPending}
              >
                Leave
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  joinMutation.mutate(
                    { groupId: group.id },
                    { onError: (error) => toast.error(getApiErrorMessage(error, 'Failed to join group')) },
                  )
                }
                disabled={joinMutation.isPending}
              >
                Join
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {group.description ? <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{group.description}</p> : null}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              {group.location ? (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {group.location}
                </div>
              ) : null}
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {group.postCount} posts
              </div>
            </div>
            <div className="text-xs">Created {new Date(group.createdAt).toLocaleDateString()}</div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleCreateGroup = () => {
    if (createName.trim().length < 3) {
      toast.error('Group name must be at least 3 characters.');
      return;
    }
    createMutation.mutate(
      {
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        location: createLocation.trim() || undefined,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setCreateName('');
          setCreateDescription('');
          setCreateLocation('');
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Failed to create group'));
        },
      },
    );
  };

  return (
    <AuthGuard title="Sign in to view groups" description="Please sign in to see and join groups.">
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Groups</h1>
              <p className="text-muted-foreground">Connect with fellow freedivers and join communities.</p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search groups..."
                className="w-full pl-10 pr-4 py-2"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

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
                    {getApiErrorMessage(allGroupsError, 'Failed to load groups')}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.isArray(allGroups?.groups) && allGroups.groups.length > 0 ? (
                      allGroups.groups.map((group) => <GroupCard key={group.id} group={group} />)
                    ) : (
                      <div className="col-span-full text-center py-8 text-muted-foreground">No groups found</div>
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
                    {getApiErrorMessage(userGroupsError, 'Failed to load your groups')}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.isArray(userGroups?.groups) && userGroups.groups.length > 0 ? (
                      userGroups.groups.map((group) => <GroupCard key={group.id} group={group} />)
                    ) : (
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-group-name">Group name *</Label>
              <Input
                id="create-group-name"
                placeholder="e.g. Manila Freedivers"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-group-description">Description</Label>
              <Input
                id="create-group-description"
                placeholder="e.g. Weekly pool sessions and open water trips"
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-group-location">Location</Label>
              <Input
                id="create-group-location"
                placeholder="e.g. Manila, Philippines"
                value={createLocation}
                onChange={(event) => setCreateLocation(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={createMutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
