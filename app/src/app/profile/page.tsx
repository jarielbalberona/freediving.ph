"use client";

import { useUser } from '@clerk/nextjs';
import { useCurrentUser } from '@/features/user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary, FeatureErrorBoundary } from '@/components/error-boundary';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Settings, Star, Award, MapPin, Calendar } from 'lucide-react';
import { useState } from 'react';

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const { data: user, isLoading } = useCurrentUser();

  if (!isLoaded || isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!clerkUser) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-semibold mb-2">Please sign in to view your profile</h2>
          <p className="text-muted-foreground">
            You need to be signed in to view your profile.
          </p>
        </div>
      </div>
    );
  }

  const userData = user?.data?.data;

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Profile Header */}
        <FeatureErrorBoundary featureName="user-profile">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={userData?.avatar || clerkUser.imageUrl || undefined} alt={userData?.firstName || clerkUser.firstName || undefined} />
                    <AvatarFallback>
                      {userData?.firstName?.charAt(0) || clerkUser.firstName?.charAt(0)}
                      {userData?.lastName?.charAt(0) || clerkUser.lastName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold">
                        {userData?.firstName || clerkUser.firstName} {userData?.lastName || clerkUser.lastName}
                      </h1>
                      {userData?.isVerified && (
                        <Badge variant="outline" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">@{userData?.username || clerkUser.username}</p>
                    {userData?.bio && (
                      <p className="text-sm">{userData.bio}</p>
                    )}
                    {userData?.location && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{userData.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{userData?.stats?.totalDives || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Dives</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userData?.stats?.maxDepth || 0}m</div>
                  <div className="text-sm text-muted-foreground">Max Depth</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userData?.stats?.totalTime || 0}h</div>
                  <div className="text-sm text-muted-foreground">Total Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{userData?.stats?.favoriteSpots || 0}</div>
                  <div className="text-sm text-muted-foreground">Favorite Spots</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </FeatureErrorBoundary>

        {/* Profile Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Experience & Certifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Experience & Certifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium">Experience Level</div>
                <Badge variant="outline" className="mt-1">
                  {userData?.experience || 'BEGINNER'}
                </Badge>
              </div>
              {userData?.certifications && userData.certifications.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Certifications</div>
                  <div className="flex flex-wrap gap-1">
                    {userData.certifications.map((cert: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {userData?.specialties && userData.specialties.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Specialties</div>
                  <div className="flex flex-wrap gap-1">
                    {userData.specialties.map((specialty: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium">Member Since</div>
                <div className="text-sm text-muted-foreground">
                  {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium">Role</div>
                <Badge variant="outline" className="mt-1">
                  {userData?.role || 'USER'}
                </Badge>
              </div>
              <div>
                <div className="text-sm font-medium">Status</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${userData?.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-muted-foreground">
                    {userData?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Tabs */}
        <Card>
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-6">
              <div className="text-center py-8 text-muted-foreground">
                Activity feed coming soon...
              </div>
            </TabsContent>

            <TabsContent value="media" className="mt-6">
              <div className="text-center py-8 text-muted-foreground">
                Media gallery coming soon...
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <div className="text-center py-8 text-muted-foreground">
                Reviews coming soon...
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
