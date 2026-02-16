"use client";

import { useUser } from '@clerk/nextjs';
import { useCurrentUser } from '@/features/user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary, FeatureErrorBoundary } from '@/components/error-boundary';
import { Users, Search, Filter, MapPin, Calendar, MessageSquare, UserPlus } from 'lucide-react';
import { useState } from 'react';

export default function BuddiesPage() {
  const { user, isLoaded } = useUser();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Sign in to find buddies</h2>
          <p className="text-muted-foreground">
            Please sign in to connect with other freedivers.
          </p>
        </div>
      </div>
    );
  }

  // Mock data for now - in a real app, this would come from an API
  const buddies = [
    {
      id: 1,
      name: "Alex Johnson",
      username: "alex_j",
      avatar: "/images/samples/alex.jpg",
      location: "Manila, Philippines",
      experience: "INTERMEDIATE",
      maxDepth: 25,
      totalDives: 45,
      isOnline: true,
      lastActive: "2 hours ago"
    },
    {
      id: 2,
      name: "Maria Santos",
      username: "maria_s",
      avatar: "/images/samples/maria.jpg",
      location: "Cebu, Philippines",
      experience: "ADVANCED",
      maxDepth: 35,
      totalDives: 78,
      isOnline: false,
      lastActive: "1 day ago"
    },
    {
      id: 3,
      name: "David Chen",
      username: "david_c",
      avatar: "/images/samples/david.jpg",
      location: "Batangas, Philippines",
      experience: "BEGINNER",
      maxDepth: 15,
      totalDives: 12,
      isOnline: true,
      lastActive: "30 minutes ago"
    }
  ];

  const filteredBuddies = buddies.filter(buddy =>
    buddy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buddy.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buddy.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const BuddyCard = ({ buddy }: { buddy: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={buddy.avatar} alt={buddy.name} />
                <AvatarFallback>{buddy.name.charAt(0)}</AvatarFallback>
              </Avatar>
              {buddy.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{buddy.name}</h3>
                <Badge variant="outline" className="text-xs">
                  {buddy.experience}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">@{buddy.username}</p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {buddy.location}
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Connect
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Max Depth</div>
            <div className="font-semibold">{buddy.maxDepth}m</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total Dives</div>
            <div className="font-semibold">{buddy.totalDives}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Last active: {buddy.lastActive}</span>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>Message</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Find Buddies</h1>
            <p className="text-muted-foreground">
              Connect with fellow freedivers and find dive partners.
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search buddies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Buddies List */}
        <FeatureErrorBoundary featureName="buddies">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBuddies.map((buddy) => (
              <BuddyCard key={buddy.id} buddy={buddy} />
            ))}
          </div>
        </FeatureErrorBoundary>
      </div>
    </div>
  );
}

