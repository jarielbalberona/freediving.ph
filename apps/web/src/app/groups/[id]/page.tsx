"use client";

import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useGroup, useGroupMembers, useGroupPosts } from '@/features/groups';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, MapPin, MessageSquare, ArrowLeft } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/http/api-error';

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const groupId = typeof params?.id === 'string' ? params.id : '';

  const { data: group, isLoading: groupLoading, error: groupError } = useGroup(groupId);
  const { data: membersData, isLoading: membersLoading, error: membersError } = useGroupMembers(groupId, 1, 20);
  const { data: postsData, isLoading: postsLoading, error: postsError } = useGroupPosts(groupId, 1, 20);

  if (groupLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (groupError || !group) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-destructive">
            {getApiErrorMessage(groupError, 'Failed to load group details')}
          </CardContent>
        </Card>
      </div>
    );
  }

  const members = membersData?.members ?? [];
  const posts = postsData?.posts ?? [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/groups')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Groups
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{group.name}</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{group.visibility}</Badge>
            <Badge variant="outline">{group.status}</Badge>
            <Badge variant="outline">join: {group.joinPolicy}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {group.description ? <p className="text-muted-foreground">{group.description}</p> : null}
          <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {group.memberCount} members
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {group.postCount} posts
            </div>
            {group.location ? (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {group.location}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : membersError ? (
              <p className="text-destructive text-sm">{getApiErrorMessage(membersError, 'Failed to load members')}</p>
            ) : members.length === 0 ? (
              <p className="text-muted-foreground text-sm">No members found.</p>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{member.displayName || member.username || member.userId}</p>
                      <p className="text-xs text-muted-foreground">{member.username || member.userId}</p>
                    </div>
                    <Badge variant="outline">{member.role}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
          </CardHeader>
          <CardContent>
            {postsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : postsError ? (
              <p className="text-destructive text-sm">{getApiErrorMessage(postsError, 'Failed to load posts')}</p>
            ) : posts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No posts yet.</p>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="border-b pb-3">
                    {post.title ? <p className="font-medium">{post.title}</p> : null}
                    <p className="text-sm text-muted-foreground line-clamp-3">{post.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      by {post.authorName || post.authorUsername || post.authorUserId}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
